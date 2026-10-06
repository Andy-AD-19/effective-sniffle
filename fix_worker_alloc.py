with open('src/worker.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(r"\'ALLOCATION\'", "'ALLOCATION'")

with open('src/worker.ts', 'w', encoding='utf-8') as f:
    f.write(c)
