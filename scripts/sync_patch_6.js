const fs = require("fs");
let code = fs.readFileSync("src/worker.ts", "utf8");

const s1 = 'if (path === "/physical-counts" && method === "POST") {';
const e1 = "return jsonResponse(count, 201);";

const s2 =
  'if (path.startsWith("/physical-counts/") && path.endsWith("/submit") && method === "POST") {';
const e2 = "return jsonResponse(count);";

let startOpen = code.indexOf(s1);
let endOpen = code.indexOf(e1, startOpen) + e1.length;
let endOpenFinal = code.indexOf("}", endOpen) + 1; // get the closing brace

let startSubmit = code.indexOf(s2);
let endSubmit = code.indexOf(e2, startSubmit) + e2.length;
let endSubmitFinal = code.indexOf("}", endSubmit) + 1;

const newOpenStr = `if (path === "/physical-counts" && method === "POST") {
        let body: any;
        try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
        
        let targetBalances = fallbackState.balances;
        if (body.locationId) targetBalances = targetBalances.filter(b => b.storeId === body.locationId);
        
        const lines = targetBalances.map(b => {
          const item = fallbackState.items.find(i => i.id === b.itemId || (i.code && i.code === b.itemId));
          if (body.categoryId && item && item.categoryId !== body.categoryId) return null;
          return {
            id: uid("cntline"),
            countId: "PENDING",
            itemId: b.itemId,
            batchId: b.batchId,
            storageLocationId: b.storageLocationId,
            systemQuantity: Number(b.quantityOnHand || 0),
            countedQuantity: 0,
            variance: 0,
            item: enrichItem(item)
          };
        }).filter(Boolean);

        const count = {
          id: uid("cnt"),
          countNumber: \`CNT-\${Date.now().toString().slice(-6)}\`,
          cycleType: body.cycleType || "ANNUAL",
          locationId: body.locationId,
          categoryId: body.categoryId,
          status: "OPEN",
          openedAt: new Date().toISOString(),
          createdById: user?.id || "usr-admin",
          lines: lines
        };
        fallbackState.counts.unshift(count);

        if (env.DB) {
          try {
            await env.DB.prepare(
              \`INSERT INTO PhysicalCount (id, countNumber, storeId, status, conductedById, createdAt, updatedAt)
               VALUES (?, ?, ?, 'OPEN', ?, datetime('now'), datetime('now'))\`
            ).bind(count.id, count.countNumber, count.locationId || "store-main", count.createdById).run();
          } catch (e) { console.error("[D1 Error]", e); }
        }

        await recordAudit(env, fallbackState, user, "count.open", "PhysicalCount", count.id);
        return jsonResponse(count, 201);
      }`;

const newSubmitStr = `if (path.startsWith("/physical-counts/") && path.endsWith("/submit") && method === "POST") {
        const id = getPathSegment(path, 1);
        let body: any;
        try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
        const count = fallbackState.counts.find(c => c.id === id);
        if (!count) return jsonResponse({ message: "Physical count not found" }, 404);
        
        count.lines = body.lines || count.lines;
        let hasVariance = false;
        
        for (const line of count.lines) {
          const sys = Number(line.systemQuantity || 0);
          const counted = Number(line.countedQuantity || 0);
          const variance = counted - sys;
          line.variance = variance;
          if (variance !== 0) {
            hasVariance = true;
            const adj = {
              id: uid("adj"),
              adjustmentNumber: \`ADJ-\${Date.now().toString().slice(-6)}\`,
              itemId: line.itemId,
              batchId: line.batchId || null,
              storeId: count.locationId || "store-main",
              type: variance > 0 ? "GAIN" : "LOSS",
              quantity: Math.abs(variance),
              quantityDelta: variance,
              reason: "Physical count variance",
              status: "PENDING_APPROVAL",
              createdById: user?.id || "usr-admin",
              createdAt: new Date().toISOString(),
              referenceType: "PHYSICAL_COUNT",
              referenceId: count.countNumber || count.id
            };
            fallbackState.adjustments.unshift(adj);
            if (env.DB) {
              try {
                await env.DB.prepare(
                  \`INSERT INTO StockAdjustment (id, adjustmentNumber, itemId, batchId, storeId, quantityDelta, reason, status, createdById, createdAt)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?, datetime('now'))\`
                ).bind(adj.id, adj.adjustmentNumber, adj.itemId, adj.batchId, adj.storeId, adj.quantityDelta, adj.reason, adj.createdById).run();
              } catch (e) {}
            }
          }
        }
        
        count.status = hasVariance ? "PENDING_RECONCILIATION" : "RECONCILED";
        count.submittedAt = new Date().toISOString();
        await recordAudit(env, fallbackState, user, "count.submit", "PhysicalCount", count.id);

        if (env.DB) {
          try {
            await env.DB.prepare("UPDATE PhysicalCount SET status = ?, updatedAt = datetime('now') WHERE id = ?")
              .bind(count.status, id).run();
          } catch (e) { console.error("[D1 Error]", e); }
        }

        return jsonResponse(count);
      }`;

if (startOpen !== -1 && startSubmit !== -1) {
  let p1 = code.substring(0, startOpen);
  let mid = code.substring(endOpenFinal, startSubmit);
  let p2 = code.substring(endSubmitFinal);
  fs.writeFileSync("src/worker.ts", p1 + newOpenStr + mid + newSubmitStr + p2);
  console.log("Success counts");
} else {
  console.log("Not found index", startOpen, startSubmit);
}
