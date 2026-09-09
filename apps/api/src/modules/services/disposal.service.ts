import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "./audit.service";
import { LedgerService } from "./ledger.service";

@Injectable()
export class DisposalService {
  constructor(private readonly prisma: PrismaService, private readonly ledger: LedgerService, private readonly audit: AuditService) {}

  async create(actorId: string, input: any) {
    const disposal = await this.prisma.disposalRequest.create({
      data: {
        disposalNumber: await this.nextDisposalNumber(),
        reason: input.reason,
        createdById: actorId,
        status: "COMMITTEE_REVIEW",
        lines: {
          create: input.lines.map((line: any) => ({
            itemId: line.itemId,
            batchId: line.batchId,
            storageLocationId: line.storageLocationId,
            storeId: line.storeId,
            quantity: line.quantity,
            batchNumber: line.batchNumber,
            expiryDate: line.expiryDate ? new Date(line.expiryDate) : undefined
          }))
        }
      },
      include: { lines: { include: { item: true } } }
    });
    await this.audit.record({ actorId, action: "disposal.create", entityType: "DisposalRequest", entityId: disposal.id, after: disposal });
    return disposal;
  }

  async approve(actorId: string, id: string, input: any) {
    const disposal = await this.prisma.disposalRequest.update({
      where: { id },
      data: { status: "APPROVED", committeeNotes: input.committeeNotes },
      include: { lines: true }
    });
    await this.audit.record({ actorId, action: "disposal.approve", entityType: "DisposalRequest", entityId: id, after: disposal });
    return disposal;
  }

  async dispose(actorId: string, id: string, input: any) {
    const disposal = await this.prisma.disposalRequest.findUniqueOrThrow({ where: { id }, include: { lines: true } });
    if (disposal.status !== "APPROVED") throw new BadRequestException("Disposal must be approved before stock is deducted");
    for (const line of disposal.lines) {
      await this.ledger.postDisposal(actorId, disposal.id, {
        itemId: line.itemId,
        quantity: Number(line.quantity),
        batchId: line.batchId,
        storageLocationId: line.storageLocationId,
        batchNumber: line.batchNumber,
        expiryDate: line.expiryDate
      });
    }
    const updated = await this.prisma.disposalRequest.update({
      where: { id },
      data: {
        status: "DISPOSED",
        method: input.method,
        disposedAt: input.disposedAt ? new Date(input.disposedAt) : new Date(),
        responsibleParties: input.responsibleParties
      }
    });
    await this.audit.record({ actorId, action: "disposal.dispose", entityType: "DisposalRequest", entityId: id, after: updated });
    return updated;
  }

  list() {
    return this.prisma.disposalRequest.findMany({ include: { lines: { include: { item: true } } }, orderBy: { createdAt: "desc" } });
  }

  private async nextDisposalNumber() {
    const count = await this.prisma.disposalRequest.count();
    return `DSP-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
  }
}
