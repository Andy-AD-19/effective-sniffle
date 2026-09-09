import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";
import { LedgerService } from "./ledger.service";
import { LedgerEntryType, ReturnStatus } from "../domain/prisma-enums";

export interface CreateReturnLineDto {
  itemId: string;
  quantity: number;
  batchId?: string;
  batchNumber?: string;
  storageLocationId?: string;
  conditionNotes?: string;
}

export interface CreateReturnDto {
  voucherId?: string;
  issueRequestId?: string;
  departmentId?: string;
  reason: string;
  conditionNotes?: string;
  lines: CreateReturnLineDto[];
}

export interface InspectReturnLineDto {
  lineId: string;
  quantityAccepted: number;
  quantityRejected: number;
  conditionNotes?: string;
  rejectionReason?: string;
  targetStoreId?: string;
  targetStorageLocationId?: string;
  remarks?: string;
  qualityStatus?: "PASS" | "FAIL";
}

export interface InspectReturnDto {
  outcome: "APPROVED" | "REJECTED" | "PARTIALLY_APPROVED";
  qualityStatus?: "PASS" | "FAIL";
  rejectionReason?: string;
  remarks?: string;
  targetStoreId?: string;
  targetStorageLocationId?: string;
  lines?: InspectReturnLineDto[];
}

@Injectable()
export class ReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService
  ) {}

  async getOrCreateReturnedStorageLocation() {
    let store = await this.prisma.storeLocation.findFirst({
      where: { OR: [{ code: "RETURNED" }, { name: "Returned Items Location" }] }
    });
    if (!store) {
      store = await this.prisma.storeLocation.create({
        data: { code: "RETURNED", name: "Returned Items Location" }
      });
    }

    let storageLoc = await this.prisma.storageLocation.findFirst({
      where: { storeId: store.id, locationCode: "RET-HOLDING-01" }
    });
    if (!storageLoc) {
      storageLoc = await this.prisma.storageLocation.create({
        data: {
          storeId: store.id,
          locationCode: "RET-HOLDING-01",
          roomOrZone: "Returns Holding",
          shelfNumber: "R1",
          rackNumber: "R-RET",
          binNumber: "HOLD",
          description: "Dedicated holding location for returned items pending inspection"
        }
      });
    }
    return { store, storageLocation: storageLoc };
  }

  async create(actorId: string, input: CreateReturnDto) {
    if (!input.lines || input.lines.length === 0) {
      throw new BadRequestException("At least one return item line must be provided");
    }

    let voucher: any = null;
    let issueRequest: any = null;
    let departmentId = input.departmentId;

    if (input.voucherId) {
      voucher = await this.prisma.storeIssueVoucher.findUnique({
        where: { id: input.voucherId },
        include: { issueRequest: { include: { department: true } } }
      });
      if (voucher?.issueRequest) {
        issueRequest = voucher.issueRequest;
        departmentId = departmentId ?? voucher.issueRequest.departmentId;
      }
    } else if (input.issueRequestId) {
      issueRequest = await this.prisma.issueRequest.findUnique({
        where: { id: input.issueRequestId },
        include: { voucher: true, department: true }
      });
      if (issueRequest) {
        departmentId = departmentId ?? issueRequest.departmentId;
        voucher = issueRequest.voucher;
      }
    }

    const { store: retStore, storageLocation: retLoc } = await this.getOrCreateReturnedStorageLocation();

    const returnNumber = await this.nextReturnNumber();
    const returnRecord = await this.prisma.itemReturn.create({
      data: {
        returnNumber,
        voucherId: voucher?.id,
        issueRequestId: issueRequest?.id,
        departmentId,
        returnedById: actorId,
        reason: input.reason,
        conditionNotes: input.conditionNotes,
        status: ReturnStatus.PENDING_INSPECTION,
        lines: {
          create: input.lines.map((line) => ({
            itemId: line.itemId,
            quantityReturned: line.quantity,
            batchId: line.batchId,
            batchNumber: line.batchNumber,
            storageLocationId: retLoc.id,
            conditionNotes: line.conditionNotes,
            status: ReturnStatus.PENDING_INSPECTION
          }))
        }
      },
      include: {
        lines: { include: { item: { include: { category: true, unit: true } } } },
        voucher: true,
        issueRequest: { include: { department: true } },
        department: true,
        returnedBy: true
      }
    });

    for (const line of returnRecord.lines) {
      const batch = line.batchId
        ? await this.prisma.stockBatch.findUnique({ where: { id: line.batchId } })
        : await this.prisma.stockBatch.findFirst({ where: { itemId: line.itemId } });

      if (batch) {
        await this.prisma.stockLocationBalance.upsert({
          where: {
            batchId_storageLocationId: {
              batchId: batch.id,
              storageLocationId: retLoc.id
            }
          },
          update: {
            quantityOnHand: { increment: line.quantityReturned },
            quantityAvailable: { increment: line.quantityReturned }
          },
          create: {
            itemId: line.itemId,
            batchId: batch.id,
            storeId: retStore.id,
            storageLocationId: retLoc.id,
            quantityOnHand: line.quantityReturned,
            quantityAvailable: line.quantityReturned
          }
        });
      }

      await this.prisma.stockLedgerEntry.create({
        data: {
          entryNumber: "RET-LED-" + Date.now() + "-" + line.id.slice(-4),
          type: LedgerEntryType.RECEIVE_PENDING_ALLOCATION,
          itemId: line.itemId,
          quantity: line.quantityReturned,
          unitCost: batch?.unitCost,
          batchId: batch?.id,
          batchNumber: line.batchNumber ?? batch?.batchNumber,
          storeLocationId: retStore.id,
          storageLocationId: retLoc.id,
          shelfCode: retLoc.shelfNumber,
          binCode: retLoc.binNumber,
          sourceEntity: "ItemReturn",
          sourceId: returnRecord.id,
          actorId,
          notes: "Item return received into Returned Items holding location (" + retLoc.locationCode + ") pending inspection. Reason: " + input.reason
        }
      });
    }

    await this.audit.record({
      actorId,
      action: "return.create",
      entityType: "ItemReturn",
      entityId: returnRecord.id,
      after: returnRecord
    });

    return returnRecord;
  }

  async list(query: any = {}) {
    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    return this.prisma.itemReturn.findMany({
      where,
      include: {
        lines: {
          include: {
            item: { include: { category: true, unit: true } },
            storageLocation: { include: { store: true } }
          }
        },
        voucher: { include: { issueRequest: { include: { department: true } } } },
        issueRequest: { include: { department: true } },
        department: true,
        returnedBy: true,
        inspections: {
          include: {
            inspectedBy: true,
            targetStore: true,
            targetStorageLocation: true
          }
        }
      },
      orderBy: { returnedAt: "desc" }
    });
  }

  async findOne(id: string) {
    return this.prisma.itemReturn.findUniqueOrThrow({
      where: { id },
      include: {
        lines: {
          include: {
            item: { include: { category: true, unit: true } },
            storageLocation: { include: { store: true } }
          }
        },
        voucher: { include: { issueRequest: { include: { department: true } } } },
        issueRequest: { include: { department: true } },
        department: true,
        returnedBy: true,
        inspections: {
          include: {
            inspectedBy: true,
            targetStore: true,
            targetStorageLocation: true
          }
        }
      }
    });
  }

  async inspect(actorId: string, returnId: string, input: InspectReturnDto) {
    const returnRecord = await this.findOne(returnId);
    if (returnRecord.status !== ReturnStatus.PENDING_INSPECTION) {
      throw new BadRequestException("This return has already been inspected");
    }

    const { store: retStore, storageLocation: retLoc } = await this.getOrCreateReturnedStorageLocation();

    let targetStore = input.targetStoreId
      ? await this.prisma.storeLocation.findUnique({ where: { id: input.targetStoreId } })
      : await this.prisma.storeLocation.findFirst({ where: { code: "MAIN" } });
    if (!targetStore) {
      targetStore = await this.prisma.storeLocation.findFirst();
    }

    let targetStorageLoc = input.targetStorageLocationId
      ? await this.prisma.storageLocation.findUnique({ where: { id: input.targetStorageLocationId } })
      : targetStore
      ? await this.prisma.storageLocation.findFirst({ where: { storeId: targetStore.id, isActive: true } })
      : null;

    let overallAccepted = 0;
    let overallRejected = 0;
    let totalInspected = 0;

    const lineInputs = input.lines && input.lines.length > 0 ? input.lines : null;

    for (const line of returnRecord.lines) {
      const lineInput = lineInputs?.find((l) => l.lineId === line.id);
      let accepted = 0;
      let rejected = 0;

      const qtyReturned = Number(line.quantityReturned);
      if (lineInput) {
        accepted = Number(lineInput.quantityAccepted ?? 0);
        rejected = Number(lineInput.quantityRejected ?? 0);
        if (accepted + rejected !== qtyReturned) {
          rejected = Math.max(0, qtyReturned - accepted);
        }
      } else {
        if (input.outcome === "APPROVED") {
          accepted = qtyReturned;
          rejected = 0;
        } else if (input.outcome === "REJECTED") {
          accepted = 0;
          rejected = qtyReturned;
        } else {
          accepted = Math.floor(qtyReturned / 2);
          rejected = qtyReturned - accepted;
        }
      }

      overallAccepted += accepted;
      overallRejected += rejected;
      totalInspected += qtyReturned;

      const batch = line.batchId
        ? await this.prisma.stockBatch.findUnique({ where: { id: line.batchId } })
        : await this.prisma.stockBatch.findFirst({ where: { itemId: line.itemId } });

      if (batch) {
        const holdBal = await this.prisma.stockLocationBalance.findUnique({
          where: {
            batchId_storageLocationId: {
              batchId: batch.id,
              storageLocationId: retLoc.id
            }
          }
        });
        if (holdBal) {
          const newOnHand = Math.max(0, Number(holdBal.quantityOnHand) - qtyReturned);
          const newAvail = Math.max(0, Number(holdBal.quantityAvailable) - qtyReturned);
          await this.prisma.stockLocationBalance.update({
            where: { id: holdBal.id },
            data: { quantityOnHand: newOnHand, quantityAvailable: newAvail }
          });
        }
      }

      if (accepted > 0 && targetStore && targetStorageLoc && batch) {
        await this.prisma.stockLocationBalance.upsert({
          where: {
            batchId_storageLocationId: {
              batchId: batch.id,
              storageLocationId: targetStorageLoc.id
            }
          },
          update: {
            quantityOnHand: { increment: accepted },
            quantityAvailable: { increment: accepted }
          },
          create: {
            itemId: line.itemId,
            batchId: batch.id,
            storeId: targetStore.id,
            storageLocationId: targetStorageLoc.id,
            quantityOnHand: accepted,
            quantityAvailable: accepted
          }
        });

        await this.prisma.stockLedgerEntry.create({
          data: {
            entryNumber: "RET-ACC-" + Date.now() + "-" + line.id.slice(-4),
            type: LedgerEntryType.RECEIPT,
            itemId: line.itemId,
            quantity: accepted,
            unitCost: batch.unitCost,
            batchId: batch.id,
            batchNumber: line.batchNumber ?? batch.batchNumber,
            storeLocationId: targetStore.id,
            storageLocationId: targetStorageLoc.id,
            shelfCode: targetStorageLoc.shelfNumber,
            binCode: targetStorageLoc.binNumber,
            sourceEntity: "ReturnInspection",
            sourceId: returnRecord.id,
            actorId,
            notes: "Returned item accepted by inspection and restocked to " + targetStore.name + " (" + targetStorageLoc.locationCode + "). Quality: " + (input.qualityStatus ?? "PASS") + "."
          }
        });
      }

      if (rejected > 0 && batch) {
        await this.prisma.stockLedgerEntry.create({
          data: {
            entryNumber: "RET-REJ-" + Date.now() + "-" + line.id.slice(-4),
            type: LedgerEntryType.DISPOSAL,
            itemId: line.itemId,
            quantity: -rejected,
            unitCost: batch.unitCost,
            batchId: batch.id,
            batchNumber: line.batchNumber ?? batch.batchNumber,
            storeLocationId: retStore.id,
            storageLocationId: retLoc.id,
            shelfCode: retLoc.shelfNumber,
            binCode: retLoc.binNumber,
            sourceEntity: "ReturnInspection",
            sourceId: returnRecord.id,
            actorId,
            notes: "Returned item rejected by inspection: " + (input.rejectionReason ?? lineInput?.rejectionReason ?? "Damaged/Unusable stock") + ". Held in quarantine."
          }
        });
      }

      await this.prisma.itemReturnLine.update({
        where: { id: line.id },
        data: {
          quantityAccepted: accepted,
          quantityRejected: rejected,
          status: rejected === 0 ? "PASSED" : accepted === 0 ? "FAILED" : "PARTIALLY_PASSED"
        }
      });
    }

    const finalStatus =
      overallRejected === 0
        ? ReturnStatus.APPROVED
        : overallAccepted === 0
        ? ReturnStatus.REJECTED
        : ReturnStatus.PARTIALLY_APPROVED;

    const inspection = await this.prisma.returnInspection.create({
      data: {
        returnId,
        outcome: input.outcome,
        qualityStatus: input.qualityStatus ?? (finalStatus === ReturnStatus.APPROVED ? "PASS" : "FAIL"),
        quantityInspected: totalInspected,
        quantityAccepted: overallAccepted,
        quantityRejected: overallRejected,
        targetStoreId: targetStore?.id,
        targetStorageLocationId: targetStorageLoc?.id,
        rejectionReason: input.rejectionReason,
        remarks: input.remarks,
        inspectedById: actorId
      }
    });

    await this.prisma.itemReturn.update({
      where: { id: returnId },
      data: { status: finalStatus }
    });

    const updated = await this.findOne(returnId);
    await this.audit.record({
      actorId,
      action: "return.inspect",
      entityType: "ItemReturn",
      entityId: returnId,
      after: { returnRecord: updated, inspection }
    });

    return updated;
  }

  async getInspectorQueue() {
    const pendingReturns = await this.prisma.itemReturn.findMany({
      where: { status: ReturnStatus.PENDING_INSPECTION },
      include: {
        lines: { include: { item: { include: { category: true, unit: true } }, storageLocation: true } },
        voucher: { include: { issueRequest: { include: { department: true } } } },
        department: true,
        returnedBy: true
      },
      orderBy: { returnedAt: "desc" }
    });

    const pendingGrns = await this.prisma.goodsReceivingLine.findMany({
      where: { inspection: null },
      include: {
        item: { include: { category: true, unit: true } },
        grn: { include: { supplierDonor: true } }
      },
      orderBy: { grn: { createdAt: "desc" } }
    });

    const recentInspections = await this.prisma.returnInspection.findMany({
      include: {
        returnRecord: { include: { lines: { include: { item: true } }, department: true } },
        inspectedBy: true,
        targetStore: true
      },
      orderBy: { inspectedAt: "desc" },
      take: 25
    });

    return { pendingReturns, pendingGrns, recentInspections };
  }

  async getApproverQueue() {
    const pendingIssues = await this.prisma.issueRequest.findMany({
      where: { status: { in: ["SUBMITTED", "PENDING_APPROVAL"] } },
      include: {
        department: true,
        lines: { include: { item: { include: { category: true, unit: true } } } },
        approval: true
      },
      orderBy: { createdAt: "desc" }
    });

    const pendingAdjustments = await this.prisma.stockAdjustment.findMany({
      where: { status: "PENDING" },
      include: {
        item: { include: { category: true, unit: true } },
        requestedBy: true,
        physicalCount: true
      },
      orderBy: { createdAt: "desc" }
    });

    const pendingDisposals = await this.prisma.disposalRequest.findMany({
      where: { status: { in: ["PENDING_APPROVAL", "SUBMITTED", "COMMITTEE_REVIEW", "UNDER_REVIEW"] } },
      include: {
        lines: { include: { item: { include: { category: true, unit: true } } } }
      },
      orderBy: { createdAt: "desc" }
    });

    return { pendingIssues, pendingAdjustments, pendingDisposals };
  }

  private async nextReturnNumber() {
    const count = await this.prisma.itemReturn.count();
    return "RET-" + new Date().getFullYear() + "-" + String(count + 1).padStart(6, "0");
  }
}

