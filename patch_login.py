with open('apps/web/src/main.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

s = '''<div className='mt-4 pt-3 border-t border-border/60'>
					<button
						type='button'
						onClick={() => setShowServerConfig(!showServerConfig)}
						className='text-xs text-primary hover:underline flex items-center gap-1.5'
					>
						<Server size={13} />
						{showServerConfig ? 'Hide Server URL Settings' : 'Configure Server API URL'}
					</button>
					
					{showServerConfig && (
						<div className='mt-3 space-y-2 rounded-lg bg-background/50 p-3 border border-border/50'>
							<label className='block text-xs font-medium text-muted-foreground'>
								API Server URL
							</label>
							<div className='flex gap-2'>
								<input
									className='flex-1 rounded border border-border bg-background px-2 py-1 text-xs'
									placeholder='http://localhost:8787'
									value={envUrl}
									onChange={(e) => setEnvUrl(e.target.value)}
								/>
								<button
									type='button'
									onClick={async () => {
										setTestStatus('Testing...')
										try {
											const res = await fetch(\\/api/items\)
											if (res.ok) setTestStatus('Connected successfully!')
											else setTestStatus(\HTTP \\)
										} catch (e: any) {
											setTestStatus(e.message || 'Connection failed')
										}
									}}
									className='rounded bg-secondary px-2 py-1 text-xs hover:bg-secondary/80 font-medium'
								>
									Test Connection
								</button>
								{testStatus && (
									<span className={\	ext-[11px] truncate \\}>
										{testStatus}
									</span>
								)}
							</div>
						</div>
					)}
				</div>'''

c = c.replace(s, '')

with open('apps/web/src/main.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
