import re
with open('src/worker.ts', 'r', encoding='utf-8') as f:
    c = f.read()

match = re.search(r'function enrichDisposal\(.*?\}.*?\}', c, re.MULTILINE | re.DOTALL)
if match:
    print(match.group(0))

print("----")
match = re.search(r'if \(path === "/disposals" && method === "POST"\).*?return jsonResponse\(enrichDisposal', c, re.MULTILINE | re.DOTALL)
if match:
    print(match.group(0))
