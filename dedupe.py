import sys

file_path = 'apps/web/src/main.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Total Inventory Value (APPROVER block) -> hide for admin
content = content.replace("<Stat\n\t\t\t\t\t\t\tlabel='Total Inventory Value'", "{user.role !== 'SYSTEM_ADMINISTRATOR' && (<Stat\n\t\t\t\t\t\t\tlabel='Total Inventory Value'")
# Need to close the paren after the Stat component! We'll use regex for precision.
