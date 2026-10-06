const fs = require('fs');
let c = fs.readFileSync('apps/web/src/main.tsx', 'utf8');

c = c.replace(/{ key: 'reason', label: 'Reason' }/g, "{ key: 'reason', label: 'Reason', render: (row) => row.reason?.name || row.reason?.description || row.reason || 'N/A' }");
c = c.replace(/{ key: 'action', label: 'Action' }/g, "{ key: 'action', label: 'Action', render: (row) => row.action || row.status || 'N/A' }");

fs.writeFileSync('apps/web/src/main.tsx', c);
