with open('src/worker.ts', 'r', encoding='utf-8') as f:
    c = f.read()

s1 = r"disposalNumber: \DSP-\\,"
s2 = r"disposalNumber: \DSP-\\, disposalMethod: body.disposalMethod || body.action || null,"
c = c.replace(s1.replace('\\\\', '\\'), s2.replace('\\\\', '\\'))

searchInsert = '''INSERT INTO StockDisposal (id, disposalNumber, itemId, batchId, quantity, reasonId, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', datetime('now'), datetime('now'))'''
repInsert = '''INSERT INTO StockDisposal (id, disposalNumber, itemId, batchId, quantity, reasonId, disposalMethod, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', datetime('now'), datetime('now'))'''
c = c.replace(searchInsert, repInsert)

searchBind = '.bind(disp.id, disp.disposalNumber, disp.itemId || (disp.lines?.[0]?.itemId || "item-screw"), disp.batchId || null, Number(disp.quantity || disp.lines?.[0]?.quantity || 1), disp.reasonId || "disp-01").run();'
repBind = '.bind(disp.id, disp.disposalNumber, disp.itemId || (disp.lines?.[0]?.itemId || "item-screw"), disp.batchId || null, Number(disp.quantity || disp.lines?.[0]?.quantity || 1), disp.reasonId || "disp-01", disp.disposalMethod || null).run();'
c = c.replace(searchBind, repBind)

searchRet = 'return {\n      ...disp,'
repRet = 'return {\n      ...disp,\n      action: disp.disposalMethod || disp.action || null,'
c = c.replace(searchRet, repRet)

with open('src/worker.ts', 'w', encoding='utf-8') as f:
    f.write(c)
