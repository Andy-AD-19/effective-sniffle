const fs = require('fs');
let c = fs.readFileSync('apps/web/src/main.tsx', 'utf8');

const s1 = \equest<any[]>('/items', token)
			.then(setItems)
			.catch(() => setItems([]))\;

const s2 = \const endpoint = user.department?.id ? \\\/departments/\\\/issued-items\\\ : '/items';
		request<any[]>(endpoint, token)
			.then(setItems)
			.catch(() => setItems([]))\;

c = c.replace(s1, s2);
fs.writeFileSync('apps/web/src/main.tsx', c);
