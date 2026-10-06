import re
with open('src/worker.ts', 'r', encoding='utf-8') as f:
    c = f.read()

s1 = '''const balanceAfter = Math.max(0, currentBalance - issuedQty);'''
s2 = '''if (issuedQty > currentBalance) return jsonResponse({ message: \Cannot issue \ of \, only \ available.\ }, 400);
          const balanceAfter = currentBalance - issuedQty;'''
c = c.replace(s1, s2)

with open('src/worker.ts', 'w', encoding='utf-8') as f:
    f.write(c)
