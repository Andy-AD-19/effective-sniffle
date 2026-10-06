const fs = require("fs");
let code = fs.readFileSync("src/worker.ts", "utf8");

const startIndex = code.indexOf(
  'if (path.startsWith("/adjustments/") && path.endsWith("/approve") && method === "POST") {',
);
const endIndex =
  code.indexOf("return jsonResponse(enrichAdjustment(adj));", startIndex) +
  "return jsonResponse(enrichAdjustment(adj));".length +
  7;

const newStr = `if (path.startsWith("/adjustments/") && path.endsWith("/approve") && method === "POST") {
      const id = getPathSegment(path, 1);
      const adj = await getOrFetchAdjustment(id, env);
      if (!adj) return jsonResponse({ message: "Adjustment not found" }, 404);
      adj.status = "APPROVED";
      
      const qty = Number(adj.quantityDelta || adj.quantity || 0);

      const led = {
        id: uid("led"),
        itemId: adj.itemId,
        batchId: adj.batchId,
        storeId: adj.storeId,
        storageLocationId: adj.storageLocationId,
        entryType: qty > 0 ? "RECEIPT" : "ISSUE",
        quantityIn: qty > 0 ? qty : 0,
        quantityOut: qty < 0 ? Math.abs(qty) : 0,
        balanceAfter: 0,
        unitPrice: 0,
        referenceType: "ADJUSTMENT",
        referenceId: adj.adjustmentNumber || adj.id,
        createdAt: new Date().toISOString()
      };
      fallbackState.ledger.unshift(led);
      
      if (env.DB) {
        try {
          await env.DB.prepare("UPDATE StockAdjustment SET approvedById = ?, status = 'APPROVED' WHERE id = ?")
            .bind(user?.id || "usr-admin", adj.id).run();
          
          await env.DB.prepare(
            \`INSERT INTO StockLedgerEntry (id, itemId, batchId, storeId, storageLocationId, entryType, quantityIn, quantityOut, balanceAfter, unitPrice, referenceType, referenceId, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'ADJUSTMENT', ?, datetime('now'))\`
          ).bind(led.id, led.itemId, led.batchId, led.storeId, led.storageLocationId, led.entryType, led.quantityIn, led.quantityOut, led.referenceId).run();
          
          await env.DB.prepare("UPDATE StockLocationBalance SET quantityOnHand = quantityOnHand + ?, updatedAt = datetime('now') WHERE itemId = ? AND batchId = ? AND storageLocationId = ?")
            .bind(qty, led.itemId, led.batchId, led.storageLocationId).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichAdjustment(adj));
    }`;

fs.writeFileSync(
  "src/worker.ts",
  code.substring(0, startIndex) + newStr + code.substring(endIndex),
);
console.log("Success adjust");
