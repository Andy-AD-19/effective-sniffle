import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { LedgerEntryType } from "../domain/prisma-enums";
import { PrismaService } from "../prisma/prisma.service";

type Allocation = {
  itemId: string;
  batchId?: string;
  storageLocationId?: string;
  locationCode?: string;
  storeName?: string;
  quantity: number;
  unitCost?: Prisma.Decimal | null;
  batchNumber?: string | null;
  expiryDate?: Date | null;
  storeLocationId?: string | null;
  shelfCode?: string | null;
  binCode?: string | null;
};

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async balances(filters: { itemId?: string; locationId?: string } = {}) {
    const rows = await this.prisma.stockLocationBalance.findMany({
      where: {
        itemId: filters.itemId,
        storeId: filters.locationId,
        quantityOnHand: { not: 0 }
      },
      include: { item: { include: { unit: true, category: true, fundingSource: true } }, batch: true, store: true, storageLocation: true },
      orderBy: { updatedAt: "desc" }
    });
    return rows.map((row) => ({
      itemId: row.itemId,
      batchId: row.batchId,
      storageLocationId: row.storageLocationId,
      batchNumber: row.batch.batchNumber,
      expiryDate: row.batch.expiryDate,
      storeLocationId: row.storeId,
      store: row.store,
      storageLocation: row.storageLocation,
      shelfCode: row.storageLocation.shelfNumber,
      binCode: row.storageLocation.binNumber,
      quantity: Number(row.quantityOnHand),
      quantityAvailable: Number(row.quantityAvailable),
      unitCost: row.batch.unitCost,
      item: row.item
    }));
  }

  movements(filters: { itemId?: string; batchId?: string } = {}) {
    return this.prisma.stockLedgerEntry.findMany({
      where: { itemId: filters.itemId, batchId: filters.batchId },
      include: { item: true, batch: true, storageLocation: { include: { store: true } }, actor: { select: { email: true, fullName: true } } },
      orderBy: { postedAt: "desc" }
    });
  }

  async postReceipt(input: {
    actorId: string;
    itemId: string;
    quantity: number;
    unitCost: number;
    batchId?: string;
    batchNumber?: string;
    expiryDate?: Date;
    storeLocationId?: string;
    storageLocationId?: string;
    shelfCode?: string;
    binCode?: string;
    sourceEntity: string;
    sourceId: string;
    grnLineId?: string;
    notes?: string;
  }) {
    return this.prisma.stockLedgerEntry.create({
      data: {
        entryNumber: await this.nextEntryNumber(),
        type: LedgerEntryType.RECEIPT,
        itemId: input.itemId,
        quantity: input.quantity,
        unitCost: input.unitCost,
        batchId: input.batchId,
        batchNumber: input.batchNumber,
        expiryDate: input.expiryDate,
        storeLocationId: input.storeLocationId,
        storageLocationId: input.storageLocationId,
        shelfCode: input.shelfCode,
        binCode: input.binCode,
        sourceEntity: input.sourceEntity,
        sourceId: input.sourceId,
        grnLineId: input.grnLineId,
        actorId: input.actorId,
        notes: input.notes
      }
    });
  }

  async postPendingReceipt(input: {
    actorId: string;
    itemId: string;
    quantity: number;
    unitCost: number;
    batchId?: string;
    batchNumber?: string | null;
    expiryDate?: Date | null;
    sourceEntity: string;
    sourceId: string;
    grnLineId?: string;
    notes?: string;
  }) {
    return this.prisma.stockLedgerEntry.create({
      data: {
        entryNumber: await this.nextEntryNumber(),
        type: LedgerEntryType.RECEIVE_PENDING_ALLOCATION,
        itemId: input.itemId,
        quantity: input.quantity,
        unitCost: input.unitCost,
        batchId: input.batchId,
        batchNumber: input.batchNumber,
        expiryDate: input.expiryDate,
        sourceEntity: input.sourceEntity,
        sourceId: input.sourceId,
        grnLineId: input.grnLineId,
        actorId: input.actorId,
        notes: input.notes
      }
    });
  }

  async postIssue(actorId: string, voucherId: string, itemId: string, quantity: number, allowPartial = false) {
    const allocations = await this.allocate(itemId, quantity, allowPartial);
    return Promise.all(
      allocations.map(async (lot) => {
        if (lot.batchId && lot.storageLocationId) {
          await this.prisma.stockLocationBalance.update({
            where: { batchId_storageLocationId: { batchId: lot.batchId, storageLocationId: lot.storageLocationId } },
            data: {
              quantityOnHand: { decrement: lot.quantity },
              quantityAvailable: { decrement: lot.quantity }
            }
          });
          const remaining = await this.prisma.stockLocationBalance.aggregate({
            where: { batchId: lot.batchId },
            _sum: { quantityOnHand: true }
          });
          if (Number(remaining._sum.quantityOnHand ?? 0) <= 0) {
            await this.prisma.stockBatch.update({ where: { id: lot.batchId }, data: { status: "EXHAUSTED" } });
          }
        }
        return this.prisma.stockLedgerEntry.create({
          data: {
            entryNumber: this.nextEntryNumberSync(),
            type: LedgerEntryType.ISSUE,
            itemId,
            quantity: -lot.quantity,
            unitCost: lot.unitCost,
            batchId: lot.batchId,
            batchNumber: lot.batchNumber,
            expiryDate: lot.expiryDate,
            storeLocationId: lot.storeLocationId,
            storageLocationId: lot.storageLocationId,
            shelfCode: lot.shelfCode,
            binCode: lot.binCode,
            sourceEntity: "StoreIssueVoucher",
            sourceId: voucherId,
            voucherId,
            actorId
          }
        });
      })
    );
  }

  async postIssueFromLocation(actorId: string, voucherId: string, input: { itemId: string; quantity: number; batchId: string; storageLocationId: string }) {
    if (input.quantity <= 0) throw new BadRequestException("Issued quantity must be greater than zero");
    const balance = await this.prisma.stockLocationBalance.findUnique({
      where: { batchId_storageLocationId: { batchId: input.batchId, storageLocationId: input.storageLocationId } },
      include: { batch: true, storageLocation: true, store: true, item: true }
    });
    if (!balance || balance.itemId !== input.itemId) throw new BadRequestException("Selected storage location does not hold this item batch");
    if (!balance.storageLocation.isActive) throw new BadRequestException("Cannot issue from an inactive storage location");
    if (Number(balance.quantityAvailable) < input.quantity) throw new BadRequestException("Issued quantity exceeds available stock at the selected location");
    await this.prisma.stockLocationBalance.update({
      where: { id: balance.id },
      data: {
        quantityOnHand: { decrement: input.quantity },
        quantityAvailable: { decrement: input.quantity }
      }
    });
    const remaining = await this.prisma.stockLocationBalance.aggregate({
      where: { batchId: balance.batchId },
      _sum: { quantityOnHand: true }
    });
    if (Number(remaining._sum.quantityOnHand ?? 0) <= 0) {
      await this.prisma.stockBatch.update({ where: { id: balance.batchId }, data: { status: "EXHAUSTED" } });
    }
    return this.prisma.stockLedgerEntry.create({
      data: {
        entryNumber: await this.nextEntryNumber(),
        type: LedgerEntryType.ISSUE,
        itemId: input.itemId,
        quantity: -input.quantity,
        unitCost: balance.batch.unitCost,
        batchId: balance.batchId,
        batchNumber: balance.batch.batchNumber,
        expiryDate: balance.batch.expiryDate,
        storeLocationId: balance.storeId,
        storageLocationId: balance.storageLocationId,
        shelfCode: balance.storageLocation.shelfNumber,
        binCode: balance.storageLocation.binNumber,
        sourceEntity: "StoreIssueVoucher",
        sourceId: voucherId,
        voucherId,
        actorId
      }
    });
  }

  async postDisposal(actorId: string, disposalId: string, input: { itemId: string; quantity: number; batchId?: string | null; storageLocationId?: string | null; batchNumber?: string | null; expiryDate?: Date | null }) {
    let balance = input.batchId && input.storageLocationId
      ? await this.prisma.stockLocationBalance.findUnique({
          where: { batchId_storageLocationId: { batchId: input.batchId, storageLocationId: input.storageLocationId } },
          include: { batch: true, storageLocation: true }
        })
      : null;
    if (!balance) {
      balance = await this.prisma.stockLocationBalance.findFirst({
        where: { itemId: input.itemId, quantityAvailable: { gte: input.quantity }, batch: { batchNumber: input.batchNumber ?? undefined, expiryDate: input.expiryDate ?? undefined } },
        include: { batch: true, storageLocation: true },
        orderBy: { updatedAt: "asc" }
      });
    }
    if (!balance || Number(balance.quantityAvailable) < input.quantity) throw new BadRequestException("Disposal quantity exceeds available stock");
    await this.prisma.stockLocationBalance.update({
      where: { id: balance.id },
      data: { quantityOnHand: { decrement: input.quantity }, quantityAvailable: { decrement: input.quantity } }
    });
    return this.prisma.stockLedgerEntry.create({
      data: {
        entryNumber: await this.nextEntryNumber(),
        type: LedgerEntryType.DISPOSAL,
        itemId: input.itemId,
        quantity: -input.quantity,
        batchId: balance.batchId,
        batchNumber: balance.batch.batchNumber,
        expiryDate: balance.batch.expiryDate,
        storeLocationId: balance.storeId,
        storageLocationId: balance.storageLocationId,
        shelfCode: balance.storageLocation.shelfNumber,
        binCode: balance.storageLocation.binNumber,
        sourceEntity: "DisposalRequest",
        sourceId: disposalId,
        actorId
      }
    });
  }

  async postAdjustment(input: {
    actorId: string;
    adjustmentId: string;
    itemId: string;
    quantityDelta: number;
    batchId?: string | null;
    storageLocationId?: string | null;
    batchNumber?: string | null;
    expiryDate?: Date | null;
    notes?: string;
  }) {
    let balance = input.batchId && input.storageLocationId
      ? await this.prisma.stockLocationBalance.findUnique({
          where: { batchId_storageLocationId: { batchId: input.batchId, storageLocationId: input.storageLocationId } },
          include: { batch: true, storageLocation: true }
        })
      : null;
    if (!balance && input.quantityDelta < 0) {
      balance = await this.prisma.stockLocationBalance.findFirst({
        where: { itemId: input.itemId, quantityAvailable: { gte: Math.abs(input.quantityDelta) }, batch: { batchNumber: input.batchNumber ?? undefined, expiryDate: input.expiryDate ?? undefined } },
        include: { batch: true, storageLocation: true },
        orderBy: { updatedAt: "asc" }
      });
    }
    if (input.quantityDelta < 0 && (!balance || Number(balance.quantityAvailable) < Math.abs(input.quantityDelta))) throw new BadRequestException("Adjustment would make stock negative");
    if (balance) {
      await this.prisma.stockLocationBalance.update({
        where: { id: balance.id },
        data: {
          quantityOnHand: { increment: input.quantityDelta },
          quantityAvailable: { increment: input.quantityDelta }
        }
      });
    }
    return this.prisma.stockLedgerEntry.create({
      data: {
        entryNumber: await this.nextEntryNumber(),
        type: input.quantityDelta >= 0 ? LedgerEntryType.ADJUSTMENT_IN : LedgerEntryType.ADJUSTMENT_OUT,
        itemId: input.itemId,
        quantity: input.quantityDelta,
        batchId: balance?.batchId ?? input.batchId,
        batchNumber: balance?.batch.batchNumber ?? input.batchNumber,
        expiryDate: balance?.batch.expiryDate ?? input.expiryDate,
        storeLocationId: balance?.storeId,
        storageLocationId: balance?.storageLocationId ?? input.storageLocationId,
        shelfCode: balance?.storageLocation.shelfNumber,
        binCode: balance?.storageLocation.binNumber,
        sourceEntity: "StockAdjustment",
        sourceId: input.adjustmentId,
        actorId: input.actorId,
        notes: input.notes
      }
    });
  }

  async allocate(itemId: string, quantity: number, allowPartial = false): Promise<Allocation[]> {
    const item = await this.prisma.item.findUniqueOrThrow({ where: { id: itemId } });
    if (!item.active) throw new BadRequestException("Stock issuance only allows active items");
    const lots = await this.prisma.stockLocationBalance.findMany({
      where: { itemId, quantityAvailable: { gt: 0 }, batch: { status: { in: ["AVAILABLE", "PENDING_STORAGE"] } }, storageLocation: { isActive: true } },
      include: { batch: true, storageLocation: true, store: true }
    });
    const sorted = lots.sort((a, b) => {
      const expiryA = a.batch.expiryDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const expiryB = b.batch.expiryDate?.getTime() ?? Number.POSITIVE_INFINITY;
      if (expiryA !== expiryB) return expiryA - expiryB;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    const total = sorted.reduce((sum, lot) => sum + Number(lot.quantityAvailable), 0);
    if (total < quantity && !allowPartial) throw new BadRequestException("Requested quantity exceeds available stock");
    if (total <= 0) throw new BadRequestException("No available stock for this item");
    let remaining = allowPartial ? Math.min(quantity, total) : quantity;
    const allocations: Allocation[] = [];
    for (const lot of sorted) {
      if (remaining <= 0) break;
      const available = Number(lot.quantityAvailable);
      const taken = Math.min(available, remaining);
      allocations.push({
        itemId,
        batchId: lot.batchId,
        storageLocationId: lot.storageLocationId,
        locationCode: lot.storageLocation.locationCode,
        storeName: lot.store.name,
        quantity: taken,
        unitCost: lot.batch.unitCost,
        batchNumber: lot.batch.batchNumber,
        expiryDate: lot.batch.expiryDate,
        storeLocationId: lot.storeId,
        shelfCode: lot.storageLocation.shelfNumber,
        binCode: lot.storageLocation.binNumber
      });
      remaining -= taken;
    }
    if (remaining > 0) throw new BadRequestException("No assigned stock is available for requested quantity");
    return allocations;
  }

  private async availableQuantity(itemId: string, batchNumber?: string, expiryDate?: Date) {
    const entries = await this.prisma.stockLocationBalance.aggregate({
      where: { itemId, batch: { batchNumber, expiryDate } },
      _sum: { quantityAvailable: true }
    });
    return Number(entries._sum.quantityAvailable ?? 0);
  }

  private async nextEntryNumber() {
    const count = await this.prisma.stockLedgerEntry.count();
    return `LED-${new Date().getFullYear()}-${String(count + 1).padStart(8, "0")}`;
  }

  private nextEntryNumberSync() {
    return `LED-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }
}
