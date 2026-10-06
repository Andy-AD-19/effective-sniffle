const fs = require('fs');
let c = fs.readFileSync('src/worker.ts', 'utf8');

// 1. Add inserting lines to POST /returns
const search1 = \      if (env.DB) {
        try {
          await env.DB.prepare(
            \\\INSERT INTO ItemReturn (id, returnNumber, departmentId, returnedById, reason, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, 'PENDING_INSPECTION', datetime('now'), datetime('now'))\\\
          ).bind(ret.id, ret.returnNumber, ret.departmentId, user?.id || "usr-admin", ret.reason).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }\;
const replace1 = \      if (env.DB) {
        try {
          await env.DB.prepare(
            \\\INSERT INTO ItemReturn (id, returnNumber, departmentId, returnedById, reason, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, 'PENDING_INSPECTION', datetime('now'), datetime('now'))\\\
          ).bind(ret.id, ret.returnNumber, ret.departmentId, user?.id || "usr-admin", ret.reason).run();
          
          for (const line of (body.lines || [])) {
            await env.DB.prepare(
              \\\INSERT INTO ItemReturnLine (id, returnId, itemId, batchId, quantityReturned)
                 VALUES (?, ?, ?, ?, ?)\\\
            ).bind(line.id || uid('retl'), ret.id, line.itemId, line.batchId || null, line.quantityReturned || line.quantity || 0).run();
          }
        } catch (e) { console.error("[D1 Error]", e); }
      }\;

c = c.replace(search1, replace1);

// 2. Add /departments/:id/issued-items endpoint
// We can just add it before the first return
const depItemsBlock = \
    if (path.startsWith("/departments/") && path.endsWith("/issued-items") && method === "GET") {
      const depId = getPathSegment(path, 1);
      let items = [];
      if (env.DB) {
        try {
          const res = await env.DB.prepare(
            \\\SELECT DISTINCT i.* FROM Item i
               JOIN StockLedgerEntry l ON i.id = l.itemId
               WHERE l.entryType = 'ISSUE' AND l.departmentId = ?\\\
          ).bind(depId).all();
          items = res.results || [];
        } catch (e) { console.error("[D1 Error]", e); }
      }
      if (!items.length) {
        const issuedItemIds = fallbackState.ledger.filter(l => l.entryType === 'ISSUE' && l.departmentId === depId).map(l => l.itemId);
        items = fallbackState.items.filter(i => issuedItemIds.includes(i.id));
      }
      return jsonResponse(items.map(enrichItem));
    }
\;

c = c.replace('if (path === "/departments" && method === "GET") {', depItemsBlock + '\n    if (path === "/departments" && method === "GET") {');

fs.writeFileSync('src/worker.ts', c);
