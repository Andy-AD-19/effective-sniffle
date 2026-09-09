import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";
import { LedgerService } from "./ledger.service";

@Injectable()
export class PhysicalCountService {
  constructor(private readonly prisma: PrismaService, private readonly ledger: LedgerService, private readonly audit: AuditService) {}

  async open(actorId: string, input: any) {
    const balances = await this.ledger.balances({ locationId: input.locationId });
    const count = await this.prisma.physicalCount.create({
      data: {
        countNumber: await this.nextCountNumber(),
        cycleType: input.cycleType,
        locationId: input.locationId,
        categoryId: input.categoryId,
        openedById: actorId,
        lines: {
          create: balances.map((balance) => ({
            itemId: balance.itemId,
            batchId: balance.batchId,
            storageLocationId: balance.storageLocationId,
            storeId: balance.storeLocationId,
            batchNumber: balance.batchNumber,
            expiryDate: balance.expiryDate,
            systemQuantity: balance.quantity
          }))
        }
      },
      include: { lines: { include: { item: true } } }
    });
    await this.audit.record({ actorId, action: "count.open", entityType: "PhysicalCount", entityId: count.id, after: count });
    return count;
  }

  async submit(actorId: string, id: string, input: any) {
    for (const line of input.lines) {
      await this.prisma.physicalCountLine.update({
        where: { id: line.id },
        data: {
          countedQuantity: line.countedQuantity,
          variance: Number(line.countedQuantity) - Number(line.systemQuantity),
          notes: line.notes
        }
      });
    }
    const lines = await this.prisma.physicalCountLine.findMany({ where: { physicalCountId: id } });
    for (const line of lines) {
      const variance = Number(line.variance ?? 0);
      if (variance !== 0) {
        await this.prisma.stockAdjustment.upsert({
          where: { physicalCountLineId: line.id },
          update: { quantityDelta: variance, reason: "Physical count variance", status: "PENDING" },
          create: {
            adjustmentNumber: await this.nextAdjustmentNumber(),
            physicalCountId: id,
            physicalCountLineId: line.id,
            itemId: line.itemId,
            batchId: line.batchId,
            storageLocationId: line.storageLocationId,
            storeId: line.storeId,
            batchNumber: line.batchNumber,
            expiryDate: line.expiryDate,
            quantityDelta: variance,
            reason: "Physical count variance",
            requestedById: actorId
          }
        });
      }
    }
    const hasVariance = lines.some((line) => Number(line.variance ?? 0) !== 0);
    const count = await this.prisma.physicalCount.update({ where: { id }, data: { status: hasVariance ? "PENDING_RECONCILIATION" : "RECONCILED", submittedAt: new Date() } });
    await this.audit.record({ actorId, action: "count.submit", entityType: "PhysicalCount", entityId: id, after: count });
    return count;
  }

  list() {
    return this.prisma.physicalCount.findMany({ include: { lines: { include: { item: true, adjustment: true } }, adjustments: true }, orderBy: { openedAt: "desc" } });
  }

  adjustments() {
    return this.prisma.stockAdjustment.findMany({
      include: {
        item: true,
        physicalCount: true,
        requestedBy: { select: { fullName: true, email: true } },
        approver: { select: { fullName: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async decideAdjustment(actorId: string, id: string, approve: boolean, comment?: string) {
    if (!approve && !comment?.trim()) throw new BadRequestException("Rejection comment is required");
    const adjustment = await this.prisma.stockAdjustment.findUniqueOrThrow({ where: { id } });
    if (adjustment.status !== "PENDING") return adjustment;
    let ledgerEntryId: string | undefined;
    if (approve) {
      const ledger = await this.ledger.postAdjustment({
        actorId,
        adjustmentId: adjustment.id,
        itemId: adjustment.itemId,
        quantityDelta: Number(adjustment.quantityDelta),
        batchId: adjustment.batchId,
        storageLocationId: adjustment.storageLocationId,
        batchNumber: adjustment.batchNumber,
        expiryDate: adjustment.expiryDate,
        notes: comment ?? adjustment.reason
      });
      ledgerEntryId = ledger.id;
    }
    const updated = await this.prisma.stockAdjustment.update({
      where: { id },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        approverId: actorId,
        approvalComment: comment?.trim(),
        decidedAt: new Date(),
        ledgerEntryId
      }
    });
    await this.audit.record({ actorId, action: approve ? "adjustment.approve" : "adjustment.reject", entityType: "StockAdjustment", entityId: id, after: updated });
    if (approve && adjustment.physicalCountId) {
      const remaining = await this.prisma.stockAdjustment.count({ where: { physicalCountId: adjustment.physicalCountId, status: "PENDING" } });
      if (remaining === 0) await this.prisma.physicalCount.update({ where: { id: adjustment.physicalCountId }, data: { status: "RECONCILED" } });
    }
    return this.prisma.stockAdjustment.findUniqueOrThrow({
      where: { id: updated.id },
      include: {
        item: true,
        physicalCount: true,
        requestedBy: { select: { fullName: true, email: true } },
        approver: { select: { fullName: true, email: true } }
      }
    });
  }

  private async nextCountNumber() {
    const count = await this.prisma.physicalCount.count();
    return `CNT-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
  }

  private async nextAdjustmentNumber() {
    const count = await this.prisma.stockAdjustment.count();
    return `ADJ-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
  }
}
