with open('apps/web/src/main.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Desktop settings nav
c = c.replace('<NavItem label="Desktop Settings"', '{/* <NavItem label="Desktop Settings"')
c = c.replace('onClick={() => setPage("desktop-settings")}', 'onClick={() => setPage("desktop-settings")} */}')
c = c.replace('{page === "desktop-settings" && <DesktopSettingsPage />}', '')

# 2. Return form endpoint
s1 = '''request<any[]>('/items', token)
			.then(setItems)
			.catch(() => setItems([]))'''
s2 = '''const endpoint = user.department?.id ? \/departments/\/issued-items\ : '/items';
		request<any[]>(endpoint, token)
			.then(setItems)
			.catch(() => setItems([]))'''
c = c.replace(s1, s2)

with open('apps/web/src/main.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
