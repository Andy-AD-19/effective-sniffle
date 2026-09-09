import { strict as assert } from "node:assert";
import { buildSivPrintDocument } from "../apps/web/src/printTemplates";

const html = buildSivPrintDocument({
  requestNumber: "REQ-2026-000008",
  status: "ISSUED",
  purpose: "Ward replenishment",
  department: { name: "Administration" },
  voucher: { voucherNumber: "SIV-2026-000008", createdAt: "2026-08-03T15:09:48.000Z" },
  lines: [
    {
      quantity: 40,
      item: {
        code: "CYL-0001",
        description: "Cylinder kit",
        unit: { name: "Each", symbol: "ea" },
        category: { name: "Equipment" }
      }
    }
  ]
});

assert.match(html, /FMOH Inventory Management System/);
assert.match(html, /Federal Ministry of Health - Inventory and Logistics Report/);
assert.match(html, /Store Issue Voucher Report/);
assert.match(html, /Generated:/);
assert.match(html, /Criteria: Request REQ-2026-000008; SIV SIV-2026-000008/);
assert.match(html, /Rows: 1/);
assert.match(html, /Request \/ SIV/);
assert.match(html, /Issued Quantity/);
assert.match(html, /Cylinder kit/);
assert.doesNotMatch(html, /Request \/ Department List/);
assert.doesNotMatch(html, /Showing 1-8 of/);

console.log("SIV print format regression passed.");
