import { BadRequestException, Injectable } from "@nestjs/common";
import { buildOfflineQrLabelDataUrl } from "@fmoh/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";
import { LedgerService } from "./ledger.service";

@Injectable()
export class StorageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ledger: LedgerService
  ) {}

  listLocations() {
    return this.prisma.storageLocation.findMany({ include: { store: true }, orderBy: { locationCode: "asc" } });
  }

  async createLocation(actorId: string, input: any) {
    const locationCode = String(input.locationCode ?? "").trim();
    if (!locationCode) throw new BadRequestException("Location code is required");
    this.validateGln(input.gln);
    const duplicate = await this.prisma.storageLocation.findUnique({ where: { locationCode } });
    if (duplicate) throw new BadRequestException("A storage location with this code already exists. Use Edit to update it or choose a unique code.");
    const location = await this.prisma.storageLocation.create({
      data: {
        storeId: input.storeId,
        locationCode,
        gln: this.cleanOptional(input.gln),
        roomOrZone: input.roomOrZone,
        shelfNumber: input.shelfNumber,
        rackNumber: input.rackNumber,
        binNumber: input.binNumber,
        description: input.description
      },
      include: { store: true }
    });
    await this.audit.record({ actorId, action: "storage.location.create", entityType: "StorageLocation", entityId: location.id, after: location });
    return location;
  }

  async updateLocation(actorId: string, id: string, input: any) {
    const before = await this.prisma.storageLocation.findUniqueOrThrow({ where: { id }, include: { store: true } });
    const locationCode = input.locationCode === undefined ? before.locationCode : String(input.locationCode).trim();
    if (!locationCode) throw new BadRequestException("Location code is required");
    this.validateGln(input.gln);
    const duplicate = await this.prisma.storageLocation.findFirst({ where: { locationCode, id: { not: id } } });
    if (duplicate) throw new BadRequestException("A storage location with this code already exists. Choose a unique code.");
    const location = await this.prisma.storageLocation.update({
      where: { id },
      data: {
        storeId: input.storeId ?? before.storeId,
        locationCode,
        gln: input.gln === undefined ? before.gln : this.cleanOptional(input.gln),
        roomOrZone: input.roomOrZone ?? before.roomOrZone,
        shelfNumber: input.shelfNumber ?? before.shelfNumber,
        rackNumber: input.rackNumber ?? before.rackNumber,
        binNumber: input.binNumber ?? before.binNumber,
        description: input.description ?? before.description,
        isActive: input.isActive ?? before.isActive
      },
      include: { store: true }
    });
    await this.audit.record({ actorId, action: "storage.location.update", entityType: "StorageLocation", entityId: id, before, after: location });
    return location;
  }

  async setLocationActive(actorId: string, id: string, active: boolean) {
    const before = await this.prisma.storageLocation.findUniqueOrThrow({ where: { id } });
    const location = await this.prisma.storageLocation.update({ where: { id }, data: { isActive: Boolean(active) }, include: { store: true } });
    await this.audit.record({ actorId, action: active ? "storage.location.activate" : "storage.location.deactivate", entityType: "StorageLocation", entityId: id, before, after: location });
    return location;
  }

  listBatches() {
    return this.prisma.stockBatch.findMany({
      include: { item: true, grnLine: { include: { grn: true } }, locationBalances: { include: { store: true, storageLocation: true } } },
      orderBy: { createdAt: "desc" }
    });
  }

  async createPendingBatchFromInspection(actorId: string, grnLineId: string, accepted: number) {
    const existing = await this.prisma.stockBatch.findFirst({ where: { grnLineId } });
    if (existing || accepted <= 0) return existing;
    const line = await this.prisma.goodsReceivingLine.findUniqueOrThrow({
      where: { id: grnLineId },
      include: { item: true, grn: true }
    });
    const batchValue = `BAT-${Date.now()}-${grnLineId.slice(-5)}`;
    const batch = await this.prisma.stockBatch.create({
      data: {
        itemId: line.itemId,
        grnLineId,
        batchNumber: line.batchNumber,
        expiryDate: line.expiryDate,
        receivedDate: line.grn.receivedAt,
        unitCost: line.unitPrice,
        fundingSourceId: line.fundingSourceId ?? line.item.fundingSourceId,
        sourceReference: line.grn.grnNumber,
        totalAcceptedQuantity: accepted,
        remainingQuantity: accepted,
        barcodeValue: `${batchValue}-BAR`,
        qrCodeValue: `${batchValue}-QR`,
        status: "PENDING_STORAGE"
      }
    });
    await this.audit.record({ actorId, action: "stockBatch.createPending", entityType: "StockBatch", entityId: batch.id, after: batch });
    return batch;
  }

  async allocate(actorId: string, batchId: string, input: any) {
    const batch = await this.prisma.stockBatch.findUniqueOrThrow({ where: { id: batchId }, include: { item: true } });
    const quantity = Number(input.quantity);
    if (quantity <= 0) throw new BadRequestException("Allocation quantity must be greater than zero");
    if (quantity > Number(batch.remainingQuantity)) throw new BadRequestException("Cannot allocate more than remaining accepted quantity");
    const location = await this.prisma.storageLocation.findUniqueOrThrow({ where: { id: input.storageLocationId }, include: { store: true } });
    if (!location.isActive) throw new BadRequestException("Cannot allocate stock to an inactive storage location");
    const existing = await this.prisma.stockLocationBalance.findUnique({
      where: { batchId_storageLocationId: { batchId, storageLocationId: location.id } }
    });
    if (existing) throw new BadRequestException("This batch is already allocated to that storage location");
    const gtin = batch.item.gtin ?? undefined;
    const lotNumber = batch.batchNumber ?? undefined;
    const expiryDate = batch.expiryDate ?? undefined;
    const gln = location.gln ?? undefined;
    const gs1 = this.gs1Identifiers({ gtin, lotNumber, expiryDate, gln });
    const payload = {
      itemCode: batch.item.code,
      gtin,
      itemName: batch.item.description,
      batchNumber: batch.batchNumber,
      lotNumber,
      expiryDate: batch.expiryDate,
      store: location.store.name,
      gln,
      locationCode: location.locationCode,
      shelfNumber: location.shelfNumber,
      binLocation: location.binNumber,
      quantity,
      gs1
    };
    const payloadJson = JSON.stringify(payload);
    const qrPayload = buildOfflineQrLabelDataUrl(payload);
    const codeValue = gs1.elementString || `FMOH|${batch.item.code}|${batch.batchNumber ?? batch.id}|${location.locationCode}|${Date.now()}`;
    const balance = await this.prisma.stockLocationBalance.create({
      data: {
        itemId: batch.itemId,
        batchId,
        storeId: location.storeId,
        storageLocationId: location.id,
        quantityOnHand: quantity,
        quantityAvailable: quantity,
        barcodes: {
          create: [
            { batchId, storageLocationId: location.id, format: "BARCODE", value: `${codeValue}|BAR`, payload: payloadJson, gs1ElementString: gs1.elementString || undefined, uploadedFileId: input.barcodeFileId || undefined },
            { batchId, storageLocationId: location.id, format: "QR_CODE", value: `${codeValue}|QR`, payload: qrPayload, gs1ElementString: gs1.elementString || undefined, uploadedFileId: input.qrCodeFileId || undefined }
          ]
        }
      },
      include: { item: true, batch: true, store: true, storageLocation: true, barcodes: { include: { uploadedFile: true } } }
    });
    const remaining = Number(batch.remainingQuantity) - quantity;
    await this.prisma.stockBatch.update({
      where: { id: batchId },
      data: { remainingQuantity: remaining, status: remaining === 0 ? "AVAILABLE" : "PENDING_STORAGE" }
    });
    await this.ledger.postReceipt({
      actorId,
      itemId: batch.itemId,
      quantity,
      unitCost: Number(batch.unitCost ?? 0),
      batchId: batch.id,
      batchNumber: batch.batchNumber ?? undefined,
      expiryDate: batch.expiryDate ?? undefined,
      storeLocationId: location.storeId,
      storageLocationId: location.id,
      shelfCode: location.shelfNumber,
      binCode: location.binNumber,
      sourceEntity: "StockLocationBalance",
      sourceId: balance.id,
      grnLineId: batch.grnLineId ?? undefined,
      notes: "Storage allocation made stock available"
    });
    await this.audit.record({ actorId, action: "storage.allocate", entityType: "StockLocationBalance", entityId: balance.id, after: balance });
    return this.withParsedBarcodePayloads(balance);
  }

  async locationBalances(query: { barcode?: string } = {}) {
    const balances = await this.prisma.stockLocationBalance.findMany({
      where: query.barcode
        ? { barcodes: { some: { OR: [{ value: { contains: query.barcode } }, { payload: { contains: query.barcode } }, { gs1ElementString: { contains: query.barcode } }] } } }
        : undefined,
      include: { item: true, batch: true, store: true, storageLocation: true, barcodes: { include: { uploadedFile: true } } },
      orderBy: { updatedAt: "desc" }
    });
    return balances.map((balance) => this.withParsedBarcodePayloads(balance));
  }

  private withParsedBarcodePayloads(row: any) {
    if (!row.barcodes) return row;
    return {
      ...row,
      barcodes: row.barcodes.map((barcode) => ({
        ...barcode,
        payload: this.parseJson(barcode.payload)
      }))
    };
  }

  private parseJson(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private cleanOptional(value: any) {
    const text = String(value ?? "").trim();
    return text || undefined;
  }

  private validateGln(value: any) {
    const text = String(value ?? "").trim();
    if (text && !/^\d{13}$/.test(text)) throw new BadRequestException("GLN must be 13 digits when provided");
  }

  private gs1Identifiers(input: { gtin?: string; lotNumber?: string | null; expiryDate?: Date | null; gln?: string }) {
    const gtin = input.gtin && /^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(input.gtin) ? input.gtin.padStart(14, "0") : undefined;
    const lot = input.lotNumber ? String(input.lotNumber).trim() : undefined;
    const gln = input.gln && /^\d{13}$/.test(input.gln) ? input.gln : undefined;
    const expiry = input.expiryDate ? this.gs1Date(input.expiryDate) : undefined;
    const parts = [
      gtin ? `(01)${gtin}` : "",
      lot ? `(10)${lot}` : "",
      expiry ? `(17)${expiry}` : "",
      gln ? `(414)${gln}` : ""
    ].filter(Boolean);
    return { ai01Gtin: gtin, ai10Lot: lot, ai17Expiry: expiry, ai414Gln: gln, elementString: parts.join("") };
  }

  private gs1Date(value: Date) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return `${String(date.getUTCFullYear()).slice(-2)}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
  }
}
