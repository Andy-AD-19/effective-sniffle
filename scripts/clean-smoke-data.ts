import { PrismaClient } from "@prisma/client";
import { configureSqliteDatabaseUrl } from "../apps/api/src/modules/prisma/sqlite-url";

configureSqliteDatabaseUrl();
const prisma = new PrismaClient();

async function main() {
  const smokeItems = await prisma.item.findMany({
    where: {
      OR: [
        { code: { startsWith: "SQL-" } },
        { description: { contains: "SQLite smoke" } },
        { description: { contains: "smoke item" } }
      ]
    },
    select: { id: true, code: true, description: true }
  });
  const itemIds = smokeItems.map((item) => item.id);

  const smokeReceipts = await prisma.goodsReceivingNote.findMany({
    where: {
      OR: [
        { purchaseOrderRef: { contains: "smoke" } },
        { deliveryNoteRef: { contains: "smoke" } },
        { remarks: { contains: "smoke" } },
        { lines: { some: { itemId: { in: itemIds } } } }
      ]
    },
    select: { id: true }
  });
  const receiptIds = smokeReceipts.map((receipt) => receipt.id);
  const smokeLines = await prisma.goodsReceivingLine.findMany({
    where: { OR: [{ itemId: { in: itemIds } }, { grnId: { in: receiptIds } }] },
    select: { id: true }
  });
  const grnLineIds = smokeLines.map((line) => line.id);
  const smokeBatches = await prisma.stockBatch.findMany({
    where: { OR: [{ itemId: { in: itemIds } }, { grnLineId: { in: grnLineIds } }, { barcodeValue: { startsWith: "SQL-" } }, { qrCodeValue: { startsWith: "SQL-" } }] },
    select: { id: true }
  });
  const batchIds = smokeBatches.map((batch) => batch.id);
  const smokeBalances = await prisma.stockLocationBalance.findMany({
    where: { OR: [{ itemId: { in: itemIds } }, { batchId: { in: batchIds } }] },
    select: { id: true }
  });
  const balanceIds = smokeBalances.map((balance) => balance.id);

  const result = await prisma.$transaction(async (tx) => {
    const deletedBarcodes = await tx.barcodeQRCode.deleteMany({ where: { OR: [{ batchId: { in: batchIds } }, { locationBalanceId: { in: balanceIds } }, { value: { startsWith: "SQL-" } }] } });
    const deletedLedger = await tx.stockLedgerEntry.deleteMany({ where: { OR: [{ itemId: { in: itemIds } }, { batchId: { in: batchIds } }, { grnLineId: { in: grnLineIds } }, { notes: { contains: "smoke" } }] } });
    const deletedBalances = await tx.stockLocationBalance.deleteMany({ where: { id: { in: balanceIds } } });
    const deletedBatches = await tx.stockBatch.deleteMany({ where: { id: { in: batchIds } } });
    const deletedInspections = await tx.inspection.deleteMany({ where: { grnLineId: { in: grnLineIds } } });
    const deletedLines = await tx.goodsReceivingLine.deleteMany({ where: { id: { in: grnLineIds } } });
    const deletedReceipts = await tx.goodsReceivingNote.deleteMany({ where: { id: { in: receiptIds } } });
    const deletedIssueLines = await tx.issueRequestLine.deleteMany({ where: { itemId: { in: itemIds } } });
    const deletedCountLines = await tx.physicalCountLine.deleteMany({ where: { itemId: { in: itemIds } } });
    const deletedDisposalLines = await tx.disposalLine.deleteMany({ where: { itemId: { in: itemIds } } });
    const deletedAdjustments = await tx.stockAdjustment.deleteMany({ where: { itemId: { in: itemIds } } });
    const deletedItems = await tx.item.deleteMany({ where: { id: { in: itemIds } } });
    await tx.auditLog.deleteMany({ where: { OR: [{ action: { contains: "smoke" } }, { after: { contains: "smoke" } }] } });
    return { deletedBarcodes, deletedLedger, deletedBalances, deletedBatches, deletedInspections, deletedLines, deletedReceipts, deletedIssueLines, deletedCountLines, deletedDisposalLines, deletedAdjustments, deletedItems };
  });

  console.log(JSON.stringify({ smokeItems: smokeItems.length, ...Object.fromEntries(Object.entries(result).map(([key, value]) => [key, value.count])) }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
