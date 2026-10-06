import re

file_path = 'apps/web/src/main.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the TS errors in VIEWER_AUDITOR by removing the wrappers
viewer_block_start = "{user.role === 'VIEWER_AUDITOR' && ("
viewer_block_idx = content.find(viewer_block_start)

if viewer_block_idx != -1:
    kpi_idx = content.find("<Panel", viewer_block_idx)
    viewer_block = content[viewer_block_idx:kpi_idx]
    
    # Remove wrappers
    viewer_block = viewer_block.replace("{user.role !== 'SYSTEM_ADMINISTRATOR' && (\n", "")
    viewer_block = viewer_block.replace("\t\t\t\t\t)}\n", "")
    viewer_block = viewer_block.replace("{user.role !== 'SYSTEM_ADMINISTRATOR' && vehiclesCard}", "{vehiclesCard}")
    
    content = content[:viewer_block_idx] + viewer_block + content[kpi_idx:]

# Fix apiBaseUrl in download
content = content.replace("const baseUrl = await apiBaseUrl()", "const baseUrl = getApiBaseUrl()")

# Check if there are any other apiBaseUrl calls
content = content.replace("await apiBaseUrl()", "getApiBaseUrl()")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed TS errors!')
