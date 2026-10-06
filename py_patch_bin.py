import re
with open('apps/web/src/main.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

m = re.search(r'function BinCard.*?\{[\s\S]*?columns=\{.*?\}', c, re.MULTILINE | re.DOTALL)
if m:
    print(m.group(0)[-1000:])
