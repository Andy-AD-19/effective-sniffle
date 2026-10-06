import re
with open('apps/web/src/main.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

m = re.search(r'function DisposalManagement.*?\{[\s\S]*?columns=\{(.*?)\}', c)
if m:
    print(m.group(1)[:1000])
