import { strict as assert } from "node:assert";
import { buildBinCardRows } from "../apps/api/src/modules/services/bin-card";

const item = {
  id: "item-cylinder-kit",
  description: "Cylinder kit",
  createdAt: new Date("2026-08-03T15:04:40Z"),
  createdBy: { fullName: "Storekeeper" },
  defaultLocation: { name: "Main Store" }
};

const movements = [
  {
    id: "pending-ledger",
    type: "RECEIVE_PENDING_ALLOCATION",
    quantity: 10,
    unitCost: 4000,
    batchNumber: "785564133615",
    expiryDate: new Date("2035-11-03T00:00:00Z"),
    postedAt: new Date("2026-08-03T15:08:21Z"),
    entryNumber: "LED-1",
    notes: "Accepted stock pending storage allocation",
    actor: { fullName: "Approver" },
    grnLine: { grn: { grnNumber: "GRN-1", sourceType: "GOVERNMENT_ALLOCATION", supplierDonor: { name: "Federal Allocation" } } }
  },
  {
    id: "receipt-ledger",
    type: "RECEIPT",
    quantity: 10,
    unitCost: 4000,
    batchNumber: "785564133615",
    expiryDate: new Date("2035-11-03T00:00:00Z"),
    postedAt: new Date("2026-08-03T15:09:48Z"),
    entryNumber: "LED-2",
    notes: "Storage allocation made stock available",
    actor: { fullName: "Storekeeper" },
    storageLocation: { store: { name: "Main Store" }, shelfNumber: "2", binNumber: "5" },
    grnLine: { grn: { grnNumber: "GRN-1", sourceType: "GOVERNMENT_ALLOCATION", supplierDonor: { name: "Federal Allocation" } } }
  }
];

const rows = buildBinCardRows(item, movements);
const pending = rows.find((row) => row.id === "pending-ledger");
const receipt = rows.find((row) => row.id === "receipt-ledger");

assert.equal(pending?.receivedQuantity, 10);
assert.equal(pending?.balance, 0, "pending receipt must not change running available balance");
assert.equal(receipt?.receivedQuantity, 10);
assert.equal(receipt?.balance, 10, "final receipt must add the accepted quantity exactly once");
assert.equal(rows.at(-1)?.balance, 10);

console.log("Bin card pending receipt balance regression passed.");
