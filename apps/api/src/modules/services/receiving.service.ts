import { BadRequestException, Injectable } from "@nestjs/common";
import { GoodsReceiptStatus, InspectionOutcome, QualityStatus, StockSourceType } from "../domain/prisma-enums";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";
import { LedgerService } from "./ledger.service";
import { StorageService } from "./storage.service";

@Injectable()
export class ReceivingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly storage: StorageService,
    private readonly audit: AuditService
  ) {}

  async createGrn(actorId: string, input: any) {
    this.validateSource(input);
    if (!input.supplierDonorId) throw new BadRequestException("Supplier/Donor is required");
    const supplierDonorId = await this.resolveSupplierDonorId(input.supplierDonorId);
    if (!input.lines?.length) throw new BadRequestException("At least one received item line is required");
    const itemIds = input.lines.map((line: any) => line.itemId);
    const items = await this.prisma.item.findMany({ where: { id: { in: itemIds }, active: true } });
    if (items.length !== new Set(itemIds).size) {
      throw new BadRequestException("Goods receiving only allows active items from the Item Master");
    }
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const fallbackFundingSourceId = await this.defaultFundingSourceId();
    const seen = new Set<string>();
    for (const line of input.lines) {
      const item = itemMap.get(line.itemId);
      if (!item) throw new BadRequestException("Item must exist in Item Master");
      const quantity = Number(line.quantityReceived);
      const unitPrice = Number(line.unitPrice);
      if (quantity <= 0) throw new BadRequestException("Quantity received must be greater than zero");
      if (unitPrice < 0) throw new BadRequestException("Unit price must be zero or greater");
      if (input.sourceType !== StockSourceType.PROCUREMENT && !line.fundingSourceId) throw new BadRequestException("Funding source is required for every received line");
      if (item.batchTrackingRequired && !line.batchNumber) throw new BadRequestException(`Batch number is required for ${item.code}`);
      if (item.expiryTrackingRequired && !line.expiryDate) throw new BadRequestException(`Expiry date is required for ${item.code}`);
      if (line.expiryDate && Number.isNaN(new Date(line.expiryDate).getTime())) throw new BadRequestException(`Expiry date is invalid for ${item.code}`);
      const duplicateKey = `${line.itemId}|${line.batchNumber ?? ""}`;
      if (seen.has(duplicateKey)) throw new BadRequestException("The same item and batch can appear only once per GRN");
      seen.add(duplicateKey);
    }
    const grn = await this.prisma.goodsReceivingNote.create({
      data: {
        grnNumber: await this.nextGrnNumber(),
        sourceType: input.sourceType,
        purchaseOrderRef: input.purchaseOrderRef,
        donationLetterRef: input.donationLetterRef,
        governmentAllocationRef: input.governmentAllocationRef,
        projectSupportRef: input.projectSupportRef,
        deliveryNoteRef: input.deliveryNoteRef,
        supplierDonorId,
        createdById: actorId,
        status: input.submit ? GoodsReceiptStatus.PENDING_INSPECTION : GoodsReceiptStatus.DRAFT,
        remarks: input.remarks,
        lines: {
          create: input.lines.map((line: any) => ({
            itemId: line.itemId,
            quantityReceived: Number(line.quantityReceived),
            unitPrice: Number(line.unitPrice),
            batchNumber: line.batchNumber,
            expiryDate: line.expiryDate ? new Date(line.expiryDate) : undefined,
            fundingSourceId: input.sourceType === StockSourceType.PROCUREMENT ? (line.fundingSourceId || fallbackFundingSourceId) : line.fundingSourceId,
            remarks: line.remarks
          }))
        }
      },
      include: { lines: { include: { item: true, fundingSource: true } }, supplierDonor: true }
    });
    await this.audit.record({ actorId, action: "grn.create", entityType: "GoodsReceivingNote", entityId: grn.id, after: grn });
    return grn;
  }

  private async resolveSupplierDonorId(value: string) {
    if (!value.startsWith("funding-source:")) return value;
    const fundingSourceId = value.slice("funding-source:".length);
    const fundingSource = await this.prisma.fundingSource.findUnique({ where: { id: fundingSourceId } });
    if (!fundingSource?.active) throw new BadRequestException("Choose an active supplier, donor, or funding source.");
    const existing = await this.prisma.supplierDonor.findFirst({ where: { name: fundingSource.name, active: true } });
    if (existing) return existing.id;
    const created = await this.prisma.supplierDonor.create({
      data: { name: fundingSource.name, type: StockSourceType.GOVERNMENT_ALLOCATION, contact: "Created from active funding source" }
    });
    return created.id;
  }

  async submitForInspection(actorId: string, id: string) {
    const before = await this.prisma.goodsReceivingNote.findUniqueOrThrow({ where: { id }, include: { lines: true } });
    if (before.status !== GoodsReceiptStatus.DRAFT && before.status !== GoodsReceiptStatus.SUBMITTED) {
      throw new BadRequestException("Only draft/submitted GRNs can be submitted for inspection");
    }
    if (before.lines.length === 0) throw new BadRequestException("Cannot submit a GRN without received lines");
    const grn = await this.prisma.goodsReceivingNote.update({ where: { id }, data: { status: GoodsReceiptStatus.PENDING_INSPECTION } });
    await this.audit.record({ actorId, action: "grn.submitInspection", entityType: "GoodsReceivingNote", entityId: id, before, after: grn });
    return grn;
  }

  async inspectLine(actorId: string, grnLineId: string, input: any) {
    const line = await this.prisma.goodsReceivingLine.findUniqueOrThrow({ where: { id: grnLineId }, include: { grn: true } });
    if (line.grn.status === GoodsReceiptStatus.DRAFT) throw new BadRequestException("User cannot inspect a draft GRN");
    const accepted = Number(input.quantityAccepted);
    const rejected = Number(input.quantityRejected);
    const received = Number(line.quantityReceived);
    if (accepted + rejected !== received) {
      throw new BadRequestException("Accepted plus rejected quantity must equal received quantity");
    }
    if (rejected > 0 && !input.rejectionReason) {
      throw new BadRequestException("Rejection reason is mandatory when quantity is rejected");
    }
    if (accepted > received) {
      throw new BadRequestException("Accepted quantity cannot exceed received quantity");
    }
    const qualityStatus = input.qualityStatus ?? (rejected === 0 ? QualityStatus.PASS : accepted > 0 ? QualityStatus.PARTIAL : QualityStatus.FAIL);
    if (qualityStatus === QualityStatus.FAIL && accepted > 0) {
      throw new BadRequestException("Failed quality inspection cannot be accepted");
    }
    if (qualityStatus === QualityStatus.PARTIAL && rejected > 0 && !input.rejectionReason) {
      throw new BadRequestException("Partial quality inspection requires rejection justification");
    }
    const outcome =
      accepted === 0 ? InspectionOutcome.REJECTED : rejected > 0 ? InspectionOutcome.PARTIALLY_ACCEPTED : InspectionOutcome.ACCEPTED;
    const inspection = await this.prisma.inspection.upsert({
      where: { grnLineId },
      update: {
        quantityVerified: input.quantityVerified,
        quantityAccepted: accepted,
        quantityRejected: rejected,
        outcome,
        qualityStatus,
        qualityNotes: input.qualityNotes,
        rejectionReason: input.rejectionReason,
        remarks: input.remarks,
        storeLocationId: input.storeLocationId,
        shelfCode: input.shelfCode,
        binCode: input.binCode,
        barcode: input.barcode ?? `FMOH-${grnLineId.slice(-8)}`,
        inspectedById: actorId
      },
      create: {
        grnLineId,
        quantityVerified: input.quantityVerified,
        quantityAccepted: accepted,
        quantityRejected: rejected,
        outcome,
        qualityStatus,
        qualityNotes: input.qualityNotes,
        rejectionReason: input.rejectionReason,
        remarks: input.remarks,
        storeLocationId: input.storeLocationId,
        shelfCode: input.shelfCode,
        binCode: input.binCode,
        barcode: input.barcode ?? `FMOH-${grnLineId.slice(-8)}`,
        inspectedById: actorId
      }
    });
    if (accepted > 0) {
      const batch = await this.storage.createPendingBatchFromInspection(actorId, grnLineId, accepted);
      if (batch) {
        await this.ledger.postPendingReceipt({
          actorId,
          itemId: line.itemId,
          quantity: accepted,
          unitCost: Number(line.unitPrice),
          batchId: batch.id,
          batchNumber: line.batchNumber,
          expiryDate: line.expiryDate,
          sourceEntity: "Inspection",
          sourceId: inspection.id,
          grnLineId,
          notes: "Accepted stock pending storage allocation"
        });
      }
    }
    await this.updateReceiptStatus(line.grnId);
    await this.audit.record({ actorId, action: "inspection.upsert", entityType: "Inspection", entityId: inspection.id, after: inspection });
    return inspection;
  }

  findReceipt(id: string) {
    return this.prisma.goodsReceivingNote.findUniqueOrThrow({
      where: { id },
      include: { supplierDonor: true, lines: { include: { item: true, fundingSource: true, inspection: true, stockBatches: true } } }
    });
  }

  listReceipts(query: { page?: number; pageSize?: number; sourceType?: StockSourceType; supplierDonorId?: string; status?: GoodsReceiptStatus; itemId?: string; search?: string; dateFrom?: string; dateTo?: string }) {
    const page = Number(query.page ?? 1);
    const pageSize = Math.min(Number(query.pageSize ?? 20), 100);
    const where = {
      sourceType: query.sourceType,
      supplierDonorId: query.supplierDonorId,
      status: query.status,
      receivedAt: query.dateFrom || query.dateTo ? { gte: query.dateFrom ? new Date(query.dateFrom) : undefined, lte: query.dateTo ? new Date(query.dateTo) : undefined } : undefined,
      lines: query.itemId ? { some: { itemId: query.itemId } } : undefined,
      OR: query.search
        ? [
            { grnNumber: { contains: query.search } },
            { purchaseOrderRef: { contains: query.search } },
            { donationLetterRef: { contains: query.search } },
            { deliveryNoteRef: { contains: query.search } },
            { supplierDonor: { name: { contains: query.search } } }
          ]
        : undefined
    };
    return this.prisma.goodsReceivingNote.findMany({
      where,
      include: { supplierDonor: true, lines: { include: { item: true, fundingSource: true, inspection: true, stockBatches: true } } },
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
  }

  private async nextGrnNumber() {
    const count = await this.prisma.goodsReceivingNote.count();
    return `GRN-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
  }

  private validateSource(input: any) {
    if (input.sourceType === StockSourceType.PROCUREMENT && !input.purchaseOrderRef) throw new BadRequestException("Procurement requires Purchase Order");
    if (input.sourceType === StockSourceType.DONATION && !input.donationLetterRef) throw new BadRequestException("Donation requires Donation Letter");
    if (input.sourceType === StockSourceType.GOVERNMENT_ALLOCATION && !input.governmentAllocationRef) throw new BadRequestException("Government allocation requires allocation reference");
    if (input.sourceType === StockSourceType.PROJECT_SUPPORT && !input.projectSupportRef) throw new BadRequestException("Project support requires project support reference");
  }

  private async defaultFundingSourceId() {
    const source = await this.prisma.fundingSource.findFirst({ where: { active: true }, orderBy: { name: "asc" } });
    if (!source) throw new BadRequestException("Create at least one active funding source before receiving stock");
    return source.id;
  }

  private async updateReceiptStatus(grnId: string) {
    const grn = await this.prisma.goodsReceivingNote.findUniqueOrThrow({
      where: { id: grnId },
      include: { lines: { include: { inspection: true, stockBatches: true } } }
    });
    if (grn.lines.some((line) => !line.inspection)) return;
    const accepted = grn.lines.reduce((sum, line) => sum + Number(line.inspection?.quantityAccepted ?? 0), 0);
    const rejected = grn.lines.reduce((sum, line) => sum + Number(line.inspection?.quantityRejected ?? 0), 0);
    const pendingStorage = grn.lines.some((line) => line.stockBatches.some((batch) => Number(batch.remainingQuantity) > 0));
    const status =
      accepted === 0
        ? GoodsReceiptStatus.REJECTED
        : rejected > 0
          ? GoodsReceiptStatus.PARTIALLY_ACCEPTED
          : pendingStorage
            ? GoodsReceiptStatus.PENDING_STORAGE_ALLOCATION
            : GoodsReceiptStatus.ACCEPTED;
    await this.prisma.goodsReceivingNote.update({ where: { id: grnId }, data: { status } });
  }
}
