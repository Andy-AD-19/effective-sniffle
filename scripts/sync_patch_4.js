const fs = require("fs");
let code = fs.readFileSync("src/worker.ts", "utf8");

const startIndex = code.indexOf(
  'if (path.startsWith("/disposals/") && path.endsWith("/dispose") && method === "POST") {',
);
const endIndex =
  code.indexOf("return jsonResponse(enrichDisposal(disp));", startIndex) +
  "return jsonResponse(enrichDisposal(disp));".length +
  7;

const newStr = `if (path.startsWith("/disposals/") && path.endsWith("/dispose") && method === "POST") {
      const id = getPathSegment(path, 1);
      const disp = await getOrFetchDisposal(id, env);
      if (!disp) return jsonResponse({ message: "Disposal request not found" }, 404);
      disp.status = "DISPOSED";
      await recordAudit(env, fallbackState, user, "disposal.dispose", "StockDisposal", disp.id);
      
      const lines = disp.lines || [];
      for (const line of lines) {
        const qty = Number(line.quantity || 0);
        if (qty <= 0) continue;
        const led = {
          id: uid("led"),
          itemId: line.itemId,
          batchId: line.batchId,
          storeId: disp.storeId || "store-gen",
          storageLocationId: line.storageLocationId || "loc-gen",
          entryType: "ISSUE",
          quantityIn: 0,
          quantityOut: qty,
          balanceAfter: 0,
          unitPrice: 0,
          referenceType: "DISPOSAL",
          referenceId: disp.disposalNumber || disp.id,
          createdAt: new Date().toISOString()
        };
        fallbackState.ledger.unshift(led);
      }

      if (env.DB) {
        try {
          await env.DB.prepare("UPDATE StockDisposal SET status = 'DISPOSED', updatedAt = datetime('now') WHERE id = ?")
            .bind(disp.id).run();
          
          for (const line of lines) {
            const qty = Number(line.quantity || 0);
            if (qty <= 0) continue;
            
            await env.DB.prepare(
              \`INSERT INTO StockLedgerEntry (id, itemId, batchId, storeId, storageLocationId, entryType, quantityIn, quantityOut, balanceAfter, unitPrice, referenceType, referenceId, createdAt)
               VALUES (?, ?, ?, ?, ?, 'ISSUE', 0, ?, 0, 0, 'DISPOSAL', ?, datetime('now'))\`
            ).bind(uid("led"), line.itemId, line.batchId, disp.storeId || "store-gen", line.storageLocationId || "loc-gen", qty, disp.disposalNumber || disp.id).run();
            
            await env.DB.prepare("UPDATE StockLocationBalance SET quantityOnHand = quantityOnHand - ?, updatedAt = datetime('now') WHERE itemId = ? AND batchId = ?")
              .bind(qty, line.itemId, line.batchId).run();
          }
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichDisposal(disp));
    }`;

fs.writeFileSync(
  "src/worker.ts",
  code.substring(0, startIndex) + newStr + code.substring(endIndex),
);
console.log("Success dispose");
