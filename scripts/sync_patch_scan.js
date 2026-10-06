const fs = require("fs");
let code = fs.readFileSync("src/worker.ts", "utf8");

const regex =
  /if \(q\.includes\("\/scan\?item="\)\) \{[\s\S]*?q = q\.toLowerCase\(\);[\s\S]*?\}\);/;

const newStr = `let scanItem = "";
          let scanBatch = "";
          if (q.includes("/scan?item=")) {
            const mItem = q.match(/item=([^&]+)/);
            if (mItem) scanItem = decodeURIComponent(mItem[1]).toLowerCase();
            const mBatch = q.match(/batch=([^&]+)/);
            if (mBatch) scanBatch = decodeURIComponent(mBatch[1]).toLowerCase();
          } else {
            scanItem = q.toLowerCase();
          }

          list = list.filter(b => {
            if (scanItem && scanBatch) {
              const bItem = (b.item?.code || b.itemId || "").toLowerCase();
              const bBatch = (b.batch?.batchNumber || b.batchId || "").toLowerCase();
              return bItem.includes(scanItem) && bBatch.includes(scanBatch);
            }
            const qq = scanItem;
            const batchNo = b.batch?.batchNumber || "";
            const itemCode = b.item?.code || "";
            const itemGtin = b.item?.gtin || "";
            const qrVal = b.batch?.qrCodeValue || "";
            const barVal = b.batch?.barcodeValue || "";
            return (b.batchId && b.batchId.toLowerCase().includes(qq)) ||
              (b.storageLocationId && b.storageLocationId.toLowerCase().includes(qq)) ||
              (b.itemId && b.itemId.toLowerCase().includes(qq)) ||
              (batchNo.toLowerCase().includes(qq)) ||
              (itemCode.toLowerCase().includes(qq)) ||
              (itemGtin.toLowerCase().includes(qq)) ||
              (qrVal.toLowerCase().includes(qq)) ||
              (barVal.toLowerCase().includes(qq));
          });`;

if (regex.test(code)) {
  fs.writeFileSync("src/worker.ts", code.replace(regex, newStr));
  console.log("Success scan");
} else {
  console.log("Not found scan");
}
