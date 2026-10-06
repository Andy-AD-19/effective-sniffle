const fs = require("fs");
let code = fs.readFileSync("src/worker.ts", "utf8");

const startMarker =
  "// If D1 database is connected, synchronize master item catalog";
const endMarker = '} catch (e) { console.error("[D1 Error]", e); }';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const pre = code.substring(0, startIndex);
  const post = code.substring(endIndex + endMarker.length);

  const newStr = `// If D1 database is connected, synchronize master item catalog into memory cache for instant lookups
    if (env.DB) {
      try {
        const dbItems = await env.DB.prepare("SELECT * FROM Item WHERE active = 1").all<any>();
        if (dbItems.results && dbItems.results.length > 0) {
          for (const item of dbItems.results) {
            const idx = fallbackState.items.findIndex(i => i.id === item.id || (i.code && i.code === item.code));
            if (idx >= 0) {
              fallbackState.items[idx] = { ...fallbackState.items[idx], ...item };
            } else {
              fallbackState.items.push(item);
            }
          }
        }
        const dbCats = await env.DB.prepare("SELECT * FROM Category").all<any>();
        if (dbCats.results && dbCats.results.length > 0) fallbackState.categories = dbCats.results;
        const dbUnits = await env.DB.prepare("SELECT * FROM UnitOfMeasure").all<any>();
        if (dbUnits.results && dbUnits.results.length > 0) fallbackState.unitsOfMeasure = dbUnits.results;
        const dbLedger = await env.DB.prepare("SELECT * FROM StockLedgerEntry").all<any>();
        if (dbLedger.results && dbLedger.results.length > 0) fallbackState.ledger = dbLedger.results;
        const dbBals = await env.DB.prepare("SELECT * FROM StockLocationBalance").all<any>();
        if (dbBals.results && dbBals.results.length > 0) fallbackState.balances = dbBals.results;
      } catch (e) { console.error("[D1 Error]", e); }`;

  fs.writeFileSync("src/worker.ts", pre + newStr + post);
  console.log("Success");
} else {
  console.log("Not found", { startIndex, endIndex });
}
