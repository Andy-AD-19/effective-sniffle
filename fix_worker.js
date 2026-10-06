const fs = require('fs');
let c = fs.readFileSync('src/worker.ts', 'utf8');
const searchRegex = /function enrichLedgerEntry.*?^\}$/sm;
c = c.replace(searchRegex, \unction enrichLedgerEntry(entry: any): any {
  if (!entry) return entry;
  const item = resolveItemFallback(entry.itemId, entry.item, entry.itemDescription, entry.itemCode);
  const batch = entry.batchId ? fallbackState.batches.find((b: any) => b.id === entry.batchId) : null;
  const quantity = Math.abs(Number(entry.quantityIn || entry.quantityOut || entry.quantity || 0));
  const unitCost = Number(entry.unitCost ?? entry.unitPrice ?? batch?.unitCost ?? item?.unitPrice ?? item?.unitCost ?? 0);
  return {
    ...entry,
    item,
    batchNumber: entry.batchNumber || batch?.batchNumber || (entry.referenceType === 'ALLOCATION' ? entry.referenceId : null),
    unitCost: unitCost,
    unitPrice: unitCost,
    totalPrice: quantity * unitCost,
    expiryDate: entry.expiryDate || batch?.expiryDate,
    category: item?.category,
    unit: item?.unit
  };
}\);
fs.writeFileSync('src/worker.ts', c);
