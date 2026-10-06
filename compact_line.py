import re

with open('apps/web/src/main.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update LineChartCard empty state to be compact if it's empty
line_empty_old = "<div className='rounded-lg border border-dashed border-border bg-background/50 p-6 text-sm text-muted-foreground'>\n\t\t\t\t\tNo consumption data for this period.\n\t\t\t\t</div>"
line_empty_new = "<div className='rounded-lg border border-dashed border-border bg-background/50 p-3 flex items-center justify-center flex-1 min-h-[60px] text-sm text-muted-foreground'>\n\t\t\t\t\tNo consumption data for this period.\n\t\t\t\t</div>"
content = content.replace(line_empty_old, line_empty_new)

with open('apps/web/src/main.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
