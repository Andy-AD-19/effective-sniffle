import re
with open('apps/web/src/main.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

m = re.search(r'function ScanPage\(\) \{[\s\S]*?return \([\s\S]*?\}\)[\s\S]*?\}', c)
if m:
    s2 = '''function ScanPage() {
	const [searchParams] = useSearchParams()
	const data = Object.fromEntries(searchParams.entries())

	return (
		<div className='p-4 max-w-md mx-auto'>
			<div className='bg-card border border-border shadow-sm rounded-xl overflow-hidden'>
				<div className='bg-primary/10 px-4 py-3 border-b border-border'>
					<h1 className='text-lg font-bold text-primary flex items-center gap-2'>
						<QrCode size={18} /> Scanned Item Details
					</h1>
				</div>
				<div className='p-4 space-y-4'>
					{Object.entries(data).map(([key, value]) => (
						<div key={key} className='flex flex-col'>
							<span className='text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5'>
								{key.replace(/([A-Z])/g, ' \').trim()}
							</span>
							<span className='text-sm font-medium text-foreground'>
								{String(value) || '-'}
							</span>
						</div>
					))}
					{Object.keys(data).length === 0 && (
						<div className='text-center text-muted-foreground py-8 text-sm'>
							No data found in QR code.
						</div>
					)}
				</div>
			</div>
		</div>
	)
}'''
    c = c.replace(m.group(0), s2)
    with open('apps/web/src/main.tsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Replaced ScanPage")
else:
    print("Could not find ScanPage")
