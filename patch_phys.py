import re
with open('apps/web/src/main.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

s1 = '''row.lines?.slice(0, 3).map((line: any) => ('''
s2 = '''row.lines?.map((line: any) => ('''
c = c.replace(s1, s2)

s3 = '''									{(row.lines?.length ?? 0) > 3 && (
										<span className='text-xs text-muted-foreground'>
											Showing first 3 lines
										</span>
									)}'''
c = c.replace(s3, '')

with open('apps/web/src/main.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
