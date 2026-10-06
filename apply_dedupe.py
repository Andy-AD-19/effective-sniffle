import re

with open('apps/web/src/main.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

out_lines = []
current_block = None

def get_block_name(line):
    if "user.role === 'STOREKEEPER'" in line: return 'STOREKEEPER'
    if "user.role === 'APPROVER'" in line: return 'APPROVER'
    if "user.role === 'INSPECTOR'" in line: return 'INSPECTOR'
    if "user.role === 'DEPARTMENT_USER'" in line: return 'DEPARTMENT_USER'
    if "user.role === 'SYSTEM_ADMINISTRATOR'" in line: return 'SYSTEM_ADMINISTRATOR'
    if "user.role === 'VIEWER_AUDITOR'" in line: return 'VIEWER_AUDITOR'
    if "<Panel" in line and "KPI health" in "".join(lines[lines.index(line):lines.index(line)+2]): return 'KPI'
    return None

hide_map = {
    'STOREKEEPER': ['Inventory value', 'Available stock', 'Batches awaiting storage', 'Pending Goods Receipts', 'Low stock alerts', 'Stock-outs'],
    'APPROVER': ['Pending Issue Approvals', 'Pending Disposals', 'Total Inventory Value', 'Available Stock Units', 'Low Stock Alerts', 'Order Fulfillment Rate'],
    'INSPECTOR': ['Pending Goods Inspections', 'Active Catalog Items', 'Verified Stock Batches'],
    'DEPARTMENT_USER': ['My Stock Requests', 'Assets in Custody', 'Available Catalog Items'],
    'VIEWER_AUDITOR': ['Inventory value', 'Available stock', 'Active catalog items'],
    'SYSTEM_ADMINISTRATOR': [],
    'KPI': []
}

i = 0
while i < len(lines):
    line = lines[i]
    b = get_block_name(line)
    if b:
        current_block = b

    # Check for {vehiclesCard}
    if "{vehiclesCard}" in line and current_block in ['STOREKEEPER', 'APPROVER', 'INSPECTOR', 'DEPARTMENT_USER', 'VIEWER_AUDITOR']:
        out_lines.append(line.replace('{vehiclesCard}', "{user.role !== 'SYSTEM_ADMINISTRATOR' && vehiclesCard}"))
        i += 1
        continue

    # Check for <Stat
    if "<Stat" in line and current_block in hide_map:
        # read ahead to find label
        j = i
        stat_block = ""
        label = None
        while j < len(lines):
            stat_block += lines[j]
            if "label='" in lines[j]:
                m = re.search(r"label='([^']+)'", lines[j])
                if m: label = m.group(1)
            if "/>" in lines[j]:
                break
            j += 1
        
        if label in hide_map[current_block]:
            # wrap stat_block
            indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
            wrapped = indent + "{user.role !== 'SYSTEM_ADMINISTRATOR' && (\n"
            wrapped += stat_block
            wrapped += indent + ")}\n"
            out_lines.append(wrapped)
            i = j + 1
            continue
    
    out_lines.append(line)
    i += 1

with open('apps/web/src/main.tsx', 'w', encoding='utf-8') as f:
    f.writelines(out_lines)

print('Deduplication applied successfully!')
