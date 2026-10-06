import re
with open('apps/web/src/main.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

s1 = '''				<div>
					<span className='text-muted-foreground'>Item description</span>
					<br />
					<span className='font-semibold'>{detail.description}</span>
				</div>
				<div>
					<span className='text-muted-foreground'>Unit</span>'''

s2 = '''				<div>
					<span className='text-muted-foreground'>Item description</span>
					<br />
					<span className='font-semibold'>{detail.description}</span>
				</div>
				<div>
					<span className='text-muted-foreground'>Category</span>
					<br />
					<span className='font-semibold'>{detail.category?.name ?? detail.categoryName ?? (typeof detail.category === 'string' ? detail.category : 'N/A')}</span>
				</div>
				<div>
					<span className='text-muted-foreground'>Unit</span>'''
c = c.replace(s1, s2)

with open('apps/web/src/main.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
