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

c = c.replace('<NavItem label="Desktop Settings"', '{/* <NavItem label="Desktop Settings"');
c = c.replace('onClick={() => setPage("desktop-settings")}', 'onClick={() => setPage("desktop-settings")} */}');
c = c.replace('{page === "desktop-settings" && <DesktopSettingsPage />}', '');

fs.writeFileSync('apps/web/src/main.tsx', c);
