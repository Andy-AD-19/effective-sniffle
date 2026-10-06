const fs = require("fs");
let code = fs.readFileSync("src/worker.ts", "utf8");

const regex =
  /const qrUrl = `\/scan\?item=\$\{encodeURIComponent\(batch\.item\?\.code \|\| batch\.itemId\)\}&batch=\$\{encodeURIComponent\(batch\.batchNumber \|\| id\)\}`;/;

const newStr = `const qrUrl = \`/scan?item=\${encodeURIComponent(batch.item?.code || batch.itemId)}&batch=\${encodeURIComponent(batch.batchNumber || id)}&received=\${encodeURIComponent(batch.createdAt ? String(batch.createdAt).slice(0,10) : "")}&expiry=\${encodeURIComponent(batch.expiryDate ? String(batch.expiryDate).slice(0,10) : "")}&purpose=\${encodeURIComponent(batch.item?.purpose || "")}\`;`;

if (regex.test(code)) {
  fs.writeFileSync("src/worker.ts", code.replace(regex, newStr));
  console.log("Success QR");
} else {
  console.log("Not found QR");
}
