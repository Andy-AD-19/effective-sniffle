import sys

file_path = 'apps/web/src/main.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("(user.role === 'STOREKEEPER' || user.role === 'SYSTEM_ADMINISTRATOR') && (", "user.role === 'STOREKEEPER' && (")
content = content.replace("(user.role === 'APPROVER' || user.role === 'SYSTEM_ADMINISTRATOR') && (", "user.role === 'APPROVER' && (")
content = content.replace("(user.role === 'INSPECTOR' || user.role === 'SYSTEM_ADMINISTRATOR') && (", "user.role === 'INSPECTOR' && (")
content = content.replace("(user.role === 'DEPARTMENT_USER' || user.role === 'SYSTEM_ADMINISTRATOR') && (", "user.role === 'DEPARTMENT_USER' && (")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
