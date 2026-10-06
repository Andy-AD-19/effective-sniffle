with open('TASKS.md', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('A. Returns: \"listed items\" list not available', 'A. Returns: \"listed items\" list not available [DONE: patched returns endpoint and main.tsx]')
c = c.replace('B. Login screen \"Configure Server API URL\" button: remove', 'B. Login screen \"Configure Server API URL\" button: remove [DONE: removed from main.tsx]')
c = c.replace('C. Category/Unit still blank across list/table views', 'C. Category/Unit still blank across list/table views [DONE: bound row.category?.name]')
c = c.replace('D. \"Value\" column shows \"—\" everywhere', 'D. \"Value\" column shows \"—\" everywhere [DONE: calculated on frontend]')
c = c.replace('E. Repo', 'E. Repo [DONE: reports read directly from D1 now]')
c = c.replace('F. Disposal \"Reason\" and \"Action\" columns blank.', 'F. Disposal \"Reason\" and \"Action\" columns blank. [DONE: patched main.tsx and worker.ts to use and expose disposalMethod]')

with open('TASKS.md', 'w', encoding='utf-8') as f:
    f.write(c)
