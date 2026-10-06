const fs = require("fs");
let code = fs.readFileSync("src/worker.ts", "utf8");

const regex =
  /\/\/ Calculate currentStock from balances[\s\S]*?if \(!itemBalances\.length && currentStock === 0\) \{/;

const newStr = `// Calculate currentStock from ledger
  const ledger = fallbackState.ledger.filter((l: any) => l.itemId === validId || l.itemId === item.id || (item.code && l.itemId === item.code));
  let currentStock = 0;
  for (const m of ledger.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())) {
    const qtyIn = Number(m.quantityIn || (m.entryType === "RECEIPT" || m.quantity > 0 ? Math.abs(Number(m.quantity || 0)) : 0));
    const qtyOut = Number(m.quantityOut || (m.entryType === "ISSUE" || m.quantity < 0 ? Math.abs(Number(m.quantity || 0)) : 0));
    currentStock += (qtyIn > 0 ? qtyIn : -qtyOut);
  }

  let stockStatus = "NORMAL";
  if (!ledger.length && currentStock === 0) {`;

if (regex.test(code)) {
  fs.writeFileSync("src/worker.ts", code.replace(regex, newStr));
  console.log("Success enrichItem regex");
} else {
  console.log("Not found enrichItem regex");
}
