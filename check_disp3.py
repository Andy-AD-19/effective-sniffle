import re
with open('apps/web/src/main.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

match = re.search(r'function DisposalManagement.*?\{.*?\}', c, re.MULTILINE | re.DOTALL)
if match:
    print(match.group(0)[:1000])

match = re.search(r'columns=\{.*?\}', c, re.MULTILINE | re.DOTALL)
