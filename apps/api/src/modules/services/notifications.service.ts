import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LedgerService } from "./ledger.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly ledger: LedgerService) {}

  async list() {
    const balances = await this.ledger.balances();
    const items = await this.prisma.item.findMany({
      where: { active: true },
      include: {
        ledgerEntries: { select: { id: true }, take: 1 },
        locationBalances: { select: { id: true }, take: 1 },
        stockBatches: { select: { id: true }, take: 1 }
      }
    });
    const notifications: Array<{ type: string; title: string; message: string }> = [];
    for (const item of items) {
      const quantity = balances.filter((row) => row.itemId === item.id).reduce((sum, row) => sum + row.quantity, 0);
      const hasStockActivity = item.ledgerEntries.length > 0 || item.locationBalances.length > 0 || item.stockBatches.length > 0;
      if (!hasStockActivity && quantity <= 0) continue;
      if (quantity <= 0) notifications.push({ type: "STOCK_OUT", title: "Stock-out", message: `${item.description} is out of stock` });
      else if (quantity <= Number(item.reorderLevel)) notifications.push({ type: "LOW_STOCK", title: "Low stock", message: `${item.description} is at ${quantity}` });
    }
    const pendingApprovals = await this.prisma.approvalRequest.count({ where: { status: "PENDING" } });
    if (pendingApprovals) notifications.push({ type: "PENDING_APPROVAL", title: "Pending approvals", message: `${pendingApprovals} approval request(s) need review` });
    return notifications;
  }
}
