import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";
import { LedgerService } from "./ledger.service";

@Injectable()
export class IssueService {
  constructor(private readonly prisma: PrismaService, private readonly ledger: LedgerService, private readonly audit: AuditService) {}

  async create(actorId: string, input: any) {
    const itemIds = input.lines.map((line: any) => line.itemId);
    const activeItems = await this.prisma.item.count({ where: { id: { in: itemIds }, active: true } });
    if (activeItems !== new Set(itemIds).size) {
      throw new BadRequestException("Stock requests only allow active items from the Item Master");
    }
    const recipientName = input.recipientName?.trim();
    if (!recipientName) {
      throw new BadRequestException("Recipient Name (the person receiving/certifying the items) is required");
    }
    const request = await this.prisma.issueRequest.create({
      data: {
        requestNumber: await this.nextRequestNumber(),
        requesterId: actorId,
        departmentId: input.departmentId,
        recipientName,
        purpose: input.purpose,
        status: "PENDING_APPROVAL",
        lines: { create: input.lines.map((line: any) => ({ itemId: line.itemId, quantity: line.quantity })) }
      },
      include: { lines: { include: { item: true } }, department: true }
    });
    await this.prisma.approvalRequest.create({
      data: {
        type: "ISSUE_REQUEST",
        targetEntity: "IssueRequest",
        targetId: request.id,
        requesterId: actorId,
        issueRequestId: request.id
      }
    });
    await this.audit.record({ actorId, action: "issue.create", entityType: "IssueRequest", entityId: request.id, after: request });
    return request;
  }

  async decide(actorId: string, id: string, approve: boolean, reason?: string) {
    const request = await this.prisma.issueRequest.findUniqueOrThrow({ where: { id }, include: { lines: true, approval: true } });
    if (request.status !== "SUBMITTED" && request.status !== "PENDING_APPROVAL") throw new BadRequestException("Only submitted requests can be decided");
    await this.prisma.approvalRequest.update({
      where: { id: request.approval!.id },
      data: { status: approve ? "APPROVED" : "REJECTED", approverId: actorId, decisionReason: reason, decidedAt: new Date() }
    });
    await this.prisma.issueRequest.update({ where: { id }, data: { status: approve ? "PENDING_ISSUE" : "REJECTED" } });
    const updated = await this.findOne(id);
    await this.audit.record({ actorId, action: approve ? "issue.approve" : "issue.reject", entityType: "IssueRequest", entityId: id, after: updated });
    return updated;
  }

  async issueApproved(actorId: string, id: string, input: any = {}) {
    const request = await this.prisma.issueRequest.findUniqueOrThrow({ where: { id }, include: { lines: true, voucher: true } });
    if (request.voucher) return request.voucher;
    if (request.status !== "APPROVED" && request.status !== "PENDING_ISSUE") throw new BadRequestException("Request must be approved before issue");
    const voucher = await this.prisma.storeIssueVoucher.create({
      data: {
        voucherNumber: await this.nextVoucherNumber(),
        issueRequestId: id,
        issuedById: actorId
      }
    });
    let requestedTotal = 0;
    let issuedTotal = 0;
    const explicitLines = Array.isArray(input.lines) ? input.lines : [];
    const requestedByItem = new Map<string, number>();
    for (const line of request.lines) {
      requestedByItem.set(line.itemId, (requestedByItem.get(line.itemId) ?? 0) + Number(line.quantity));
    }
    const explicitByItem = new Map<string, number>();
    for (const line of explicitLines) {
      explicitByItem.set(line.itemId, (explicitByItem.get(line.itemId) ?? 0) + Number(line.quantity ?? 0));
    }
    for (const [itemId, quantity] of explicitByItem.entries()) {
      if (quantity > (requestedByItem.get(itemId) ?? 0)) throw new BadRequestException("Cannot issue more than the approved request quantity");
    }
    if (explicitLines.length) {
      requestedTotal = request.lines.reduce((sum, line) => sum + Number(line.quantity), 0);
      for (const line of explicitLines) {
        const quantity = Number(line.quantity);
        if (!line.batchId || !line.storageLocationId) throw new BadRequestException("Select a batch and storage location before issuing");
        const entry = await this.ledger.postIssueFromLocation(actorId, voucher.id, {
          itemId: line.itemId,
          batchId: line.batchId,
          storageLocationId: line.storageLocationId,
          quantity
        });
        issuedTotal += Math.abs(Number(entry.quantity));
      }
    } else for (const line of request.lines) {
      const requested = Number(line.quantity);
      requestedTotal += requested;
      const entries = await this.ledger.postIssue(actorId, voucher.id, line.itemId, requested, true);
      issuedTotal += entries.reduce((sum, entry) => sum + Math.abs(Number(entry.quantity)), 0);
    }
    if (issuedTotal <= 0) throw new BadRequestException("No stock was issued");
    await this.prisma.issueRequest.update({ where: { id }, data: { status: issuedTotal >= requestedTotal ? "ISSUED" : "PARTIALLY_ISSUED" } });
    await this.audit.record({ actorId, action: "issue.voucher", entityType: "StoreIssueVoucher", entityId: voucher.id, after: voucher });
    return voucher;
  }

  list() {
    return this.prisma.issueRequest.findMany({
      include: {
        department: true,
        lines: {
          include: {
            item: {
              include: {
                category: true,
                unit: true,
                defaultLocation: true,
                fundingSource: true,
                grnLines: { orderBy: { id: "desc" }, take: 1 },
                stockBatches: { orderBy: { id: "desc" }, take: 1 }
              }
            }
          }
        },
        approval: { include: { approver: true, requester: true } },
        voucher: {
          include: {
            ledgerEntries: {
              include: {
                storageLocation: { include: { store: true } },
                batch: true,
                item: true
              }
            }
          }
        },
        materialReceipt: { include: { receivedBy: true } },
        returns: { include: { lines: { include: { item: true } }, inspections: true, returnedBy: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  findOne(id: string) {
    return this.prisma.issueRequest.findUniqueOrThrow({
      where: { id },
      include: {
        department: true,
        lines: {
          include: {
            item: {
              include: {
                category: true,
                unit: true,
                defaultLocation: true,
                fundingSource: true,
                grnLines: { orderBy: { id: "desc" }, take: 1 },
                stockBatches: { orderBy: { id: "desc" }, take: 1 }
              }
            }
          }
        },
        approval: { include: { approver: true, requester: true } },
        voucher: {
          include: {
            ledgerEntries: {
              include: {
                storageLocation: { include: { store: true } },
                batch: true,
                item: true
              }
            }
          }
        },
        materialReceipt: { include: { receivedBy: true } },
        returns: { include: { lines: { include: { item: true } }, inspections: true, returnedBy: true } }
      }
    });
  }

  async pickList(id: string) {
    const request = await this.prisma.issueRequest.findUniqueOrThrow({ where: { id }, include: { lines: { include: { item: true } }, department: true } });
    const picks: Array<{ item: unknown; quantityRequested: number; allocations: unknown[] }> = [];
    for (const line of request.lines) {
      const allocations = await this.ledger.allocate(line.itemId, Number(line.quantity));
      picks.push({
        item: line.item,
        quantityRequested: Number(line.quantity),
        allocations
      });
    }
    return { requestNumber: request.requestNumber, department: request.department, picks };
  }

  async acknowledgeReceipt(actorId: string, id: string, notes?: string) {
    const request = await this.prisma.issueRequest.findUniqueOrThrow({
      where: { id },
      include: { voucher: true, materialReceipt: true }
    });
    if (request.status !== "ISSUED" && request.status !== "PARTIALLY_ISSUED") throw new BadRequestException("Only issued requests can be received by a department");
    if (!request.voucher) throw new BadRequestException("Request has no store issue voucher");
    if (request.materialReceipt) return this.findOne(id);
    const receipt = await this.prisma.departmentMaterialReceipt.create({
      data: {
        receiptNumber: await this.nextMaterialReceiptNumber(),
        issueRequestId: id,
        voucherId: request.voucher.id,
        receivedById: actorId,
        notes
      }
    });
    const updated = await this.prisma.issueRequest.update({ where: { id }, data: { status: "CLOSED" } });
    await this.audit.record({ actorId, action: "issue.receive", entityType: "DepartmentMaterialReceipt", entityId: receipt.id, after: { receipt, request: updated } });
    return this.findOne(id);
  }

  private async nextRequestNumber() {
    const count = await this.prisma.issueRequest.count();
    return `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
  }

  private async nextVoucherNumber() {
    const count = await this.prisma.storeIssueVoucher.count();
    return `SIV-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
  }

  private async nextMaterialReceiptNumber() {
    const count = await this.prisma.departmentMaterialReceipt.count();
    return `DMR-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
  }
}
