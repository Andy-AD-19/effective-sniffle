const fs = require('fs');
let c = fs.readFileSync('apps/web/src/main.tsx', 'utf8');

c = c.replace(/<div className='mt-4 pt-3 border-t border-border\/60'>[\s\S]*?<\/div>\s*<\/div>\s*\)\}\s*<\/div>/, '</div>');

fs.writeFileSync('apps/web/src/main.tsx', c);
