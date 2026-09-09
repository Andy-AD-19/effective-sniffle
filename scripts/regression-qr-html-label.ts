import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { buildQrLabelScanText } from "../packages/shared/src/index";

const qr = buildQrLabelScanText({
  itemCode: "sdfdghj",
  gtin: "12345678",
  itemName: "Cylinder kit",
  batchNumber: "785564133615",
  lotNumber: "785564133615",
  expiryDate: "2035-11-03T00:00:00.000Z",
  store: "Main Store",
  locationCode: "STORE-A-S37913-B1",
  shelfNumber: "37913",
  binLocation: "1",
  quantity: 5000,
  gs1: {
    ai01Gtin: "00000012345678",
    ai10Lot: "785564133615",
    ai17Expiry: "351103",
    elementString: "(01)00000012345678(10)785564133615(17)351103"
  }
});

assert.doesNotMatch(qr, /^data:text\/html/);
assert.ok(qr.length <= 1200, `QR payload must stay scannable; got ${qr.length} characters`);
assert.match(qr, /This data represents an FMOH Inventory record for a Cylinder kit stored in the Main Store\./);
assert.match(qr, /ITEM DETAILS/);
assert.match(qr, /Item Name: Cylinder kit/);
assert.match(qr, /Item Code: sdfdghj/);
assert.match(qr, /GTIN: 12345678/);
assert.match(qr, /Quantity: 5000/);
assert.match(qr, /BATCH AND EXPIRY/);
assert.match(qr, /Batch\/Lot: 785564133615/);
assert.match(qr, /Expiry Date: 03 Nov 2035/);
assert.match(qr, /STORAGE LOCATION/);
assert.match(qr, /Location ID: STORE-A-S37913-B1/);
assert.match(qr, /GS1 ELEMENT STRING/);
assert.match(qr, /Full Code: \(01\)00000012345678\(10\)785564133615\(17\)351103/);
assert.doesNotMatch(qr.trim(), /^\{/);
assert.doesNotMatch(qr, /"itemCode"/);
assert.doesNotMatch(qr, /<[^>]+>/);

const mainSource = readFileSync("apps/web/src/main.tsx", "utf8");
assert.match(mainSource, /<QRCodeSVG[^>]*size=\{220\}/s);
assert.match(mainSource, /<QRCodeSVG[^>]*marginSize=\{4\}/s);
assert.match(mainSource, /<QRCodeSVG[^>]*level="L"/s);
assert.match(mainSource, /<QRCodeSVG[^>]*boostLevel=\{false\}/s);

console.log("QR HTML label regression passed.");
