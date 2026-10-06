import re

with open('head_main.txt', 'r', encoding='utf-8') as f:
    head_content = f.read()

with open('apps/web/src/main.tsx', 'r', encoding='utf-8') as f:
    curr_content = f.read()

def get_block(content, start_marker, end_marker):
    start = content.find(start_marker)
    end = content.find(end_marker, start)
    if start == -1 or end == -1:
        raise Exception(f"Could not find {start_marker} or {end_marker}")
    return content[start:end]

stat_start = "function Stat({"
stat_end = "function plainText("
head_stat = get_block(head_content, stat_start, stat_end)

dash_start = "function Dashboard({"
dash_end = "function ErrorState("
head_dash = get_block(head_content, dash_start, dash_end)

curr_stat = get_block(curr_content, stat_start, stat_end)
curr_content = curr_content.replace(curr_stat, head_stat)

curr_dash = get_block(curr_content, dash_start, dash_end)
curr_content = curr_content.replace(curr_dash, head_dash)

with open('apps/web/src/main.tsx', 'w', encoding='utf-8') as f:
    f.write(curr_content)

print("Restored Stat and Dashboard components from HEAD safely!")
