const fs = require('fs');
let c = fs.readFileSync('src/worker.ts', 'utf8');

const searchStr = 'message: \\Cannot issue \\ of \\, only \\ available.\\';
const replaceStr = 'message: `Cannot issue ${issuedQty} of ${line.item?.name || line.itemId}, only ${currentBalance} available.`';

c = c.replace(searchStr, replaceStr);

fs.writeFileSync('src/worker.ts', c);
