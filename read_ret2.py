import re

with open('src/worker.ts', 'r', encoding='utf-8') as f:
    c = f.read()

match = re.search(r'if \(path === "/returns" && method === "POST"\).*?return jsonResponse\(\{ success: true', c, re.MULTILINE | re.DOTALL)
if match:
    print(match.group(0))
