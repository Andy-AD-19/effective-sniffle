import { PrismaClient } from "@prisma/client";
import { configureSqliteDatabaseUrl } from "../src/modules/prisma/sqlite-url";
import { ItemKind, StockSourceType } from "../src/modules/domain/prisma-enums";
import { AuditService } from "../src/modules/services/audit.service";
import { DisposalService } from "../src/modules/services/disposal.service";
import { InventoryService } from "../src/modules/services/inventory.service";
import { IssueService } from "../src/modules/services/issue.service";
import { LedgerService } from "../src/modules/services/ledger.service";
import { PhysicalCountService } from "../src/modules/services/physical-count.service";
import { ReceivingService } from "../src/modules/services/receiving.service";
import { ReportsService } from "../src/modules/services/reports.service";
import { StorageService } from "../src/modules/services/storage.service";

configureSqliteDatabaseUrl();

async function main() {
  const prisma = new PrismaClient();
  await prisma.$connect();

  const audit = new AuditService(prisma as any);
  const inventory = new InventoryService(prisma as any, audit);
  const ledger = new LedgerService(prisma as any);
  const storage = new StorageService(prisma as any, audit, ledger);
  const receiving = new ReceivingService(prisma as any, ledger, storage, audit);
  const issue = new IssueService(prisma as any, ledger, audit);
  const physicalCount = new PhysicalCountService(prisma as any, ledger, audit);
  const disposal = new DisposalService(prisma as any, ledger, audit);
  const reports = new ReportsService(prisma as any, ledger);

  const admin = await prisma.user.findFirstOrThrow({ where: { role: "SYSTEM_ADMINISTRATOR" } });
  const storekeeper = await prisma.user.findFirstOrThrow({ where: { role: "STOREKEEPER" } });
  const requester = await prisma.user.findFirstOrThrow({ where: { role: "DEPARTMENT_USER" } });
  const approver = await prisma.user.findFirstOrThrow({ where: { role: "APPROVER" } });
  const masterData = await inventory.masterData();
  const category = masterData.categories[0];
  const unit = masterData.units[0];
  const fundingSource = masterData.fundingSources[0];
  const store = masterData.locations[0];
  const department = masterData.departments[0];
  const storageLocation = masterData.storageLocations[0];
  const supplierDonor = masterData.supplierDonors[0];

  if (!category || !unit || !fundingSource || !store || !department || !storageLocation || !supplierDonor) {
    throw new Error("Seeded master data is incomplete.");
  }

  const suffix = Date.now().toString().slice(-8);
  const item = await inventory.createItem(admin.id, {
    code: `SQL-${suffix}`,
    description: `SQLite smoke item ${suffix}`,
    kind: ItemKind.CONSUMABLE,
    categoryId: category.id,
    unitId: unit.id,
    defaultLocationId: store.id,
    reorderLevel: 5,
    minimumStock: 2,
    maximumStock: 100,
    fundingSourceId: fundingSource.id,
    batchTrackingRequired: true,
    expiryTrackingRequired: true
  });

  const listed = await inventory.listItems({ search: item.code, active: "true" });
  if (!listed.items.some((row) => row.id === item.id)) throw new Error("Item search did not return the created item.");

  const updated = await inventory.updateItem(admin.id, item.id, {
    description: `${item.description} updated`,
    categoryId: category.id,
    unitId: unit.id,
    defaultLocationId: store.id,
    reorderLevel: 6,
    minimumStock: 2,
    maximumStock: 100,
    fundingSourceId: fundingSource.id
  });
  if (!updated.description.endsWith("updated")) throw new Error("Item update failed.");

  const grn = await receiving.createGrn(storekeeper.id, {
    sourceType: StockSourceType.PROCUREMENT,
    purchaseOrderRef: `PO-SQL-${suffix}`,
    supplierDonorId: supplierDonor.id,
    submit: true,
    lines: [
      {
        itemId: item.id,
        quantityReceived: 12,
        unitPrice: 3.5,
        batchNumber: `B-SQL-${suffix}`,
        expiryDate: "2031-12-31",
        fundingSourceId: fundingSource.id
      }
    ]
  });

  const line = grn.lines[0];
  await receiving.inspectLine(storekeeper.id, line.id, {
    quantityVerified: 12,
    quantityAccepted: 12,
    quantityRejected: 0,
    storeLocationId: store.id,
    shelfCode: storageLocation.shelfNumber,
    binCode: storageLocation.binNumber
  });

  const batch = await prisma.stockBatch.findFirstOrThrow({ where: { grnLineId: line.id } });
  const balance = await storage.allocate(storekeeper.id, batch.id, {
    storageLocationId: storageLocation.id,
    quantity: 12
  });
  if (!balance.barcodes?.[0]?.payload?.itemCode) throw new Error("Barcode payload was not parsed after storage allocation.");

  const balances = await ledger.balances({ itemId: item.id });
  const quantity = balances.reduce((sum, row) => sum + row.quantity, 0);
  if (quantity !== 12) throw new Error(`Expected stock balance of 12, received ${quantity}.`);

  const receiptRows = await receiving.listReceipts({ search: grn.grnNumber });
  if (!receiptRows.some((row) => row.id === grn.id)) throw new Error("Receipt search did not return the created GRN.");

  const reportRows = await reports.data("valuation", { itemId: item.id });
  if (!Array.isArray(reportRows) || reportRows.length === 0) throw new Error("Valuation report returned no rows.");
  await reports.excel("valuation", { itemId: item.id, actorId: admin.id });
  await reports.pdf("valuation", { itemId: item.id, actorId: admin.id });

  const request = await issue.create(requester.id, {
    departmentId: department.id,
    purpose: "SQLite smoke issue",
    lines: [{ itemId: item.id, quantity: 2 }]
  });
  await issue.decide(approver.id, request.id, true, "SQLite smoke approval");
  await issue.issueApproved(storekeeper.id, request.id);
  const acknowledged = await issue.acknowledgeReceipt(requester.id, request.id, "SQLite smoke receipt");
  if (acknowledged.status !== "CLOSED") throw new Error("Issue workflow did not close after department receipt.");

  const afterIssue = await ledger.balances({ itemId: item.id });
  const issuedQuantity = afterIssue.reduce((sum, row) => sum + row.quantity, 0);
  if (issuedQuantity !== 10) throw new Error(`Expected stock balance of 10 after issue, received ${issuedQuantity}.`);

  const disposableBalance = await prisma.stockLocationBalance.findFirstOrThrow({ where: { itemId: item.id } });
  const disposalRequest = await disposal.create(storekeeper.id, {
    reason: "SQLite smoke disposal",
    lines: [
      {
        itemId: item.id,
        batchId: disposableBalance.batchId,
        storageLocationId: disposableBalance.storageLocationId,
        storeId: disposableBalance.storeId,
        quantity: 1,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate
      }
    ]
  });
  await disposal.approve(approver.id, disposalRequest.id, { committeeNotes: "SQLite smoke approval" });
  const disposed = await disposal.dispose(storekeeper.id, disposalRequest.id, { method: "SQLite smoke method" });
  if (disposed.status !== "DISPOSED") throw new Error("Disposal workflow did not finish.");

  const afterDisposal = await ledger.balances({ itemId: item.id });
  const finalQuantity = afterDisposal.reduce((sum, row) => sum + row.quantity, 0);
  if (finalQuantity !== 9) throw new Error(`Expected stock balance of 9 after disposal, received ${finalQuantity}.`);

  const count = await physicalCount.open(storekeeper.id, { cycleType: "MONTHLY", locationId: store.id });
  const countLines = count.lines.map((line) => ({ id: line.id, systemQuantity: Number(line.systemQuantity), countedQuantity: Number(line.systemQuantity) }));
  const submittedCount = await physicalCount.submit(storekeeper.id, count.id, { lines: countLines });
  if (submittedCount.status !== "RECONCILED") throw new Error("Physical count without variance did not reconcile.");

  await inventory.deactivateItem(admin.id, item.id);
  const inactive = await prisma.item.findUniqueOrThrow({ where: { id: item.id } });
  if (inactive.active) throw new Error("Item deactivation failed.");

  await prisma.$disconnect();
  console.log("SQLite smoke test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
