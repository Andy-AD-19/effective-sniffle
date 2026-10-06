import re
with open('src/worker.ts', 'r', encoding='utf-8') as f:
    c = f.read()

dep_block = '''
    if (path.startsWith("/departments/") && path.endsWith("/issued-items") && method === "GET") {
      const depId = getPathSegment(path, 1);
      let items = [];
      if (env.DB) {
        try {
          const res = await env.DB.prepare(
            "SELECT DISTINCT i.* FROM Item i JOIN StockLedgerEntry l ON i.id = l.itemId WHERE l.entryType = 'ISSUE' AND l.departmentId = ?"
          ).bind(depId).all();
          items = res.results || [];
        } catch (e) { console.error("[D1 Error]", e); }
      }
      if (!items.length) {
        const issuedItemIds = fallbackState.ledger.filter((l: any) => l.entryType === 'ISSUE' && l.departmentId === depId).map((l: any) => l.itemId);
        items = fallbackState.items.filter((i: any) => issuedItemIds.includes(i.id));
      }
      return jsonResponse(items.map(enrichItem));
    }
'''

c = c.replace('if (path === "/departments" && method === "GET") {', dep_block + '\n    if (path === "/departments" && method === "GET") {')

# Find the run() call for POST /returns
return_replace = ''').bind(ret.id, ret.returnNumber, ret.departmentId, user?.id || "usr-admin", ret.reason).run();
          for (const line of (body.lines || [])) {
            await env.DB.prepare(
              "INSERT INTO ItemReturnLine (id, returnId, itemId, batchId, quantityReturned) VALUES (?, ?, ?, ?, ?)"
            ).bind(line.id || uid("retl"), ret.id, line.itemId, line.batchId || null, line.quantityReturned || line.quantity || 0).run();
          }'''

c = c.replace(').bind(ret.id, ret.returnNumber, ret.departmentId, user?.id || "usr-admin", ret.reason).run();', return_replace)

with open('src/worker.ts', 'w', encoding='utf-8') as f:
    f.write(c)
