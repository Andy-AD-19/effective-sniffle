const fs = require('fs');
let c = fs.readFileSync('src/worker.ts', 'utf8');

// 1. update fallback object in POST /disposals
c = c.replace(
  /disposalNumber: \DSP-\$\{Date\.now\(\)\.toString\(\)\.slice\(-6\)\}\,/,
  "disposalNumber: \DSP-\\, disposalMethod: body.disposalMethod || body.action || null,"
);

// 2. update INSERT statement
const searchInsert = \INSERT INTO StockDisposal (id, disposalNumber, itemId, batchId, quantity, reasonId, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', datetime('now'), datetime('now'))\;
const repInsert = \INSERT INTO StockDisposal (id, disposalNumber, itemId, batchId, quantity, reasonId, disposalMethod, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', datetime('now'), datetime('now'))\;
c = c.replace(searchInsert, repInsert);

// 3. update bind() call
const searchBind = \.bind(disp.id, disp.disposalNumber, disp.itemId || (disp.lines?.[0]?.itemId || "item-screw"), disp.batchId || null, Number(disp.quantity || disp.lines?.[0]?.quantity || 1), disp.reasonId || "disp-01").run();\;
const repBind = \.bind(disp.id, disp.disposalNumber, disp.itemId || (disp.lines?.[0]?.itemId || "item-screw"), disp.batchId || null, Number(disp.quantity || disp.lines?.[0]?.quantity || 1), disp.reasonId || "disp-01", disp.disposalMethod).run();\;
c = c.replace(searchBind, repBind);

// 4. Update enrichDisposal to include action/disposalMethod
c = c.replace(
  /return \{\n\s*\.\.\.disp,/,
  "return { ...disp, action: disp.disposalMethod || disp.action || null,"
);

fs.writeFileSync('src/worker.ts', c);
