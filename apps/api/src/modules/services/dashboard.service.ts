import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LedgerService } from "./ledger.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService, private readonly ledger: LedgerService) {}

  async summary() {
    const balances = await this.safeQuery(() => this.ledger.balances(), []);
    const items = await this.prisma.item.findMany({ where: { active: true }, include: { category: true, unit: true, fundingSource: true } });
    const receipts = await this.safeQuery(() => this.prisma.goodsReceivingNote.findMany({
      include: { lines: { include: { inspection: true } }, supplierDonor: true },
      orderBy: { receivedAt: "desc" },
      take: 25
    }), []);
    const stockByItem = items.map((item) => {
      const quantity = balances.filter((balance) => balance.itemId === item.id).reduce((sum, balance) => sum + balance.quantity, 0);
      return { item, quantity };
    });
    const periodStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const issues = await this.safeQuery(() => this.prisma.stockLedgerEntry.groupBy({
      by: ["itemId"],
      where: { type: "ISSUE", quantity: { lt: 0 }, postedAt: { gte: periodStart } },
      _sum: { quantity: true }
    }), []);
    const issueMap = new Map(issues.map((issue) => [issue.itemId, Math.abs(Number(issue._sum.quantity ?? 0))]));
    const lowStock = stockByItem.filter(({ item, quantity }) => quantity > 0 && quantity <= Number(item.reorderLevel));
    const overStock = stockByItem.filter(({ item, quantity }) => quantity > Number(item.maximumStock));
    const stockOuts = stockByItem.filter(({ quantity }) => quantity <= 0);
    const dueForReorder = stockByItem.filter(({ item, quantity }) => quantity > 0 && quantity <= Number(item.reorderLevel));
    const deadStock = stockByItem.filter(({ item, quantity }) => quantity > 0 && !issueMap.has(item.id));
    const dailyConsumption = await this.safeQuery(() => this.consumptionByPeriod("day"), []);
    const monthlyConsumption = await this.safeQuery(() => this.consumptionByPeriod("month"), []);
    const totalInventoryValue = balances.reduce((sum, balance: any) => sum + balance.quantity * Number(balance.unitCost ?? 0), 0);
    const disposalValue = await this.safeQuery(() => this.disposalValue(), 0);
    const inventoryTurnoverRatio = await this.safeQuery(() => this.turnoverRatio(), 0);
    return {
      totalItems: items.length,
      currentStock: stockByItem.reduce((sum, row) => sum + row.quantity, 0),
      availableStock: balances.reduce((sum, row) => sum + Number(row.quantityAvailable ?? row.quantity), 0),
      totalInventoryValue,
      lowStock,
      overStock,
      stockOuts,
      belowMinimum: stockByItem.filter(({ item, quantity }) => quantity < Number(item.minimumStock)),
      dueForReorder,
      deadStock,
      inventoryValueByCategory: this.valueByItemField(balances, "category"),
      inventoryValueByFundingSource: this.valueByItemField(balances, "fundingSource"),
      pendingInspectionCount: await this.safeQuery(() => this.prisma.goodsReceivingNote.count({ where: { status: "PENDING_INSPECTION" } }), 0),
      pendingApprovalCount: await this.safeQuery(() => this.prisma.approvalRequest.count({ where: { status: "PENDING" } }), 0),
      recentlyReceivedGoods: receipts.slice(0, 10),
      rejectedGoods: receipts.filter((receipt) => receipt.status === "REJECTED" || receipt.lines.some((line) => Number(line.inspection?.quantityRejected ?? 0) > 0)),
      pendingStorageAllocation: await this.safeQuery(() => this.prisma.stockBatch.count({ where: { status: "PENDING_STORAGE", remainingQuantity: { gt: 0 } } }), 0),
      pendingDisposalCount: await this.safeQuery(() => this.prisma.disposalRequest.count({ where: { status: { in: ["COMMITTEE_REVIEW", "UNDER_REVIEW", "PENDING_APPROVAL", "APPROVED"] } } }), 0),
      acceptedStockValue: await this.safeQuery(() => this.acceptedStockValue(), 0),
      receivedStockValueBySourceType: await this.safeQuery(() => this.receivedValueBySourceType(), []),
      fastMoving: [...stockByItem].sort((a, b) => (issueMap.get(b.item.id) ?? 0) - (issueMap.get(a.item.id) ?? 0)).slice(0, 10).map((row) => ({ ...row, issuedQuantity: issueMap.get(row.item.id) ?? 0 })),
      slowMoving: [...stockByItem].sort((a, b) => (issueMap.get(a.item.id) ?? 0) - (issueMap.get(b.item.id) ?? 0)).slice(0, 10).map((row) => ({ ...row, issuedQuantity: issueMap.get(row.item.id) ?? 0 })),
      monthlyConsumption,
      disposalValue,
      inventoryTurnoverRatio,
      charts: {
        stockStatusDistribution: this.stockStatusDistribution(stockByItem),
        inventoryValueByCategory: this.valueByItemField(balances, "category"),
        inventoryValueByFundingSource: this.valueByItemField(balances, "fundingSource"),
        consumptionByDepartment: await this.safeQuery(() => this.consumptionByDepartment(periodStart), []),
        disposalReasonDistribution: await this.safeQuery(() => this.disposalReasonDistribution(), []),
        dailyConsumptionTrend: dailyConsumption,
        monthlyConsumptionTrend: monthlyConsumption
      },
      kpis: await this.safeQuery(() => this.kpis({ stockByItem, balances, totalInventoryValue, disposalValue, inventoryTurnoverRatio, deadStockCount: deadStock.length }), {
        inventoryAccuracy: null,
        stockOutRate: this.safeRatio(stockOuts.length, Math.max(stockByItem.length, 1)),
        inventoryTurnover: inventoryTurnoverRatio,
        orderFulfillmentRate: null,
        deadStockPercentage: this.safeRatio(deadStock.length, Math.max(stockByItem.length, 1)),
        disposalRate: this.safeRatio(disposalValue, Math.max(totalInventoryValue + disposalValue, 1)),
        period: "Last 90 days"
      })
    };
  }

  private async safeQuery<T>(operation: () => Promise<T>, fallback: T) {
    try {
      return await operation();
    } catch {
      return fallback;
    }
  }

  private async consumptionByPeriod(period: "day" | "month") {
    const entries = await this.prisma.stockLedgerEntry.findMany({
      where: { type: "ISSUE", postedAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } },
      select: { postedAt: true, quantity: true }
    });
    const buckets = new Map<string, number>();
    for (const entry of entries) {
      const iso = entry.postedAt.toISOString();
      const key = period === "day" ? iso.slice(0, 10) : iso.slice(0, 7);
      buckets.set(key, (buckets.get(key) ?? 0) + Math.abs(Number(entry.quantity)));
    }
    return [...buckets.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, quantity]) => (period === "day" ? { date, quantity } : { month: date, quantity }));
  }

  private async disposalValue() {
    const entries = await this.prisma.stockLedgerEntry.findMany({ where: { type: "DISPOSAL" } });
    return entries.reduce((sum, entry) => sum + Math.abs(Number(entry.quantity)) * Number(entry.unitCost ?? 0), 0);
  }

  private async turnoverRatio() {
    const issued = await this.prisma.stockLedgerEntry.aggregate({ where: { type: "ISSUE" }, _sum: { quantity: true } });
    const received = await this.prisma.stockLedgerEntry.aggregate({ where: { type: "RECEIPT" }, _sum: { quantity: true } });
    const denominator = Math.max(Number(received._sum.quantity ?? 0), 1);
    return Math.abs(Number(issued._sum.quantity ?? 0)) / denominator;
  }

  private stockStatusDistribution(stockByItem: Array<{ item: any; quantity: number }>) {
    const buckets = [
      { name: "Normal stock", value: 0 },
      { name: "Low stock", value: 0 },
      { name: "Overstock", value: 0 },
      { name: "Stock-out", value: 0 }
    ];
    for (const row of stockByItem) {
      if (row.quantity <= 0) buckets[3].value += 1;
      else if (row.quantity <= Number(row.item.reorderLevel)) buckets[1].value += 1;
      else if (row.quantity > Number(row.item.maximumStock)) buckets[2].value += 1;
      else buckets[0].value += 1;
    }
    return buckets;
  }

  private async consumptionByDepartment(periodStart: Date) {
    const vouchers = await this.prisma.storeIssueVoucher.findMany({
      where: { issuedAt: { gte: periodStart } },
      include: { issueRequest: { include: { department: true } }, ledgerEntries: true }
    });
    const buckets = new Map<string, number>();
    for (const voucher of vouchers) {
      const label = voucher.issueRequest.department?.name ?? "Unassigned";
      const quantity = voucher.ledgerEntries.reduce((sum, entry) => sum + Math.abs(Number(entry.quantity)), 0);
      buckets.set(label, (buckets.get(label) ?? 0) + quantity);
    }
    return [...buckets.entries()].map(([name, value]) => ({ name, value }));
  }

  private async disposalReasonDistribution() {
    const disposals = await this.prisma.disposalRequest.findMany({ include: { lines: true } });
    const buckets = new Map<string, number>();
    for (const disposal of disposals) {
      const quantity = disposal.lines.reduce((sum, line) => sum + Number(line.quantity), 0);
      buckets.set(disposal.reason, (buckets.get(disposal.reason) ?? 0) + quantity);
    }
    return [...buckets.entries()].map(([name, value]) => ({ name, value }));
  }

  private async kpis(input: { stockByItem: Array<{ item: any; quantity: number }>; balances: any[]; totalInventoryValue: number; disposalValue: number; inventoryTurnoverRatio: number; deadStockCount: number }) {
    const countLines = await this.prisma.physicalCountLine.findMany({ where: { countedQuantity: { not: null } } });
    const systemTotal = countLines.reduce((sum, line) => sum + Number(line.systemQuantity), 0);
    const absoluteVariance = countLines.reduce((sum, line) => sum + Math.abs(Number(line.countedQuantity ?? 0) - Number(line.systemQuantity)), 0);
    const approvedOrders = await this.prisma.issueRequest.count({ where: { status: { in: ["PENDING_ISSUE", "ISSUED", "PARTIALLY_ISSUED", "CLOSED"] } } });
    const filledOrders = await this.prisma.issueRequest.count({ where: { status: { in: ["ISSUED", "PARTIALLY_ISSUED", "CLOSED"] } } });
    const totalStockQuantity = input.stockByItem.reduce((sum, row) => sum + row.quantity, 0);
    return {
      inventoryAccuracy: systemTotal > 0 ? this.safeRatio(systemTotal - absoluteVariance, systemTotal) : null,
      stockOutRate: this.safeRatio(input.stockByItem.filter((row) => row.quantity <= 0).length, Math.max(input.stockByItem.length, 1)),
      inventoryTurnover: input.inventoryTurnoverRatio,
      orderFulfillmentRate: this.safeRatio(filledOrders, approvedOrders),
      deadStockPercentage: this.safeRatio(input.deadStockCount, Math.max(input.stockByItem.length, 1)),
      disposalRate: this.safeRatio(input.disposalValue, Math.max(input.totalInventoryValue + input.disposalValue, 1)),
      period: "Last 90 days"
    };
  }

  private safeRatio(numerator: number, denominator: number) {
    if (!denominator) return null;
    return Math.min(1, Math.max(0, numerator / denominator));
  }

  private valueByItemField(balances: any[], field: "category" | "fundingSource") {
    const buckets = new Map<string, number>();
    for (const balance of balances) {
      const label = balance.item?.[field]?.name ?? "Unassigned";
      const value = balance.quantity * Number(balance.unitCost ?? 0);
      buckets.set(label, (buckets.get(label) ?? 0) + value);
    }
    return [...buckets.entries()].map(([name, value]) => ({ name, value }));
  }

  private async acceptedStockValue() {
    const batches = await this.prisma.stockBatch.findMany();
    return batches.reduce((sum, batch) => sum + Number(batch.totalAcceptedQuantity) * Number(batch.unitCost ?? 0), 0);
  }

  private async receivedValueBySourceType() {
    const receipts = await this.prisma.goodsReceivingNote.findMany({ include: { lines: true } });
    const buckets = new Map<string, number>();
    for (const receipt of receipts) {
      const value = receipt.lines.reduce((sum, line) => sum + Number(line.quantityReceived) * Number(line.unitPrice), 0);
      buckets.set(receipt.sourceType, (buckets.get(receipt.sourceType) ?? 0) + value);
    }
    return [...buckets.entries()].map(([sourceType, value]) => ({ sourceType, value }));
  }
}
