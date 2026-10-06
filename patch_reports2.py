import re
with open('apps/api/src/modules/services/reports.service.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('this.cleanCell(String(row[column.key] ?? ""))', '(this.cleanCell(String(row[column.key] ?? "")) || "")')

with open('apps/api/src/modules/services/reports.service.ts', 'w', encoding='utf-8') as f:
    f.write(c)
