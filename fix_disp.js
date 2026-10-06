const fs = require('fs');
let c = fs.readFileSync('src/worker.ts', 'utf8');

const s1 = \\\INSERT INTO StockDisposal (id, disposalNumber, itemId, batchId, quantity, reasonId, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', datetime('now'), datetime('now'))\\\;
             
const s2 = \\\INSERT INTO StockDisposal (id, disposalNumber, itemId, batchId, quantity, reasonId, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', datetime('now'), datetime('now'))\\\;
             // Assuming schema doesn't actually have disposalMethod yet, or if it does, wait.
