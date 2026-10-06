import re
with open('apps/web/src/main.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

m = re.search(r'function DisposalManagement.*?\{([\s\S]*?)function ', c)
if m:
    disp_text = m.group(1)
    lines = disp_text.split('\n')
    for i, line in enumerate(lines):
        if 'Reason' in line or 'Action' in line:
            print(f'{i}: {line.strip()}')
