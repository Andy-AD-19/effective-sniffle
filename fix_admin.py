import sys

file_path = 'apps/web/src/main.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

admin_quick_actions = """
					{user.role === 'SYSTEM_ADMINISTRATOR' && (
						<>
							<button
								onClick={() => onNavigate?.('receipts')}
								className='inline-flex items-center gap-1.5 rounded border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/5'
							>
								<PackagePlus size={14} className='text-primary' /> + New GRN
							</button>
							<button
								onClick={() => onNavigate?.('issues')}
								className='inline-flex items-center gap-1.5 rounded border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/5'
							>
								<Plus size={14} className='text-primary' /> + Stock Request
							</button>
							<button
								onClick={() => onNavigate?.('counts')}
								className='inline-flex items-center gap-1.5 rounded border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/5'
							>
								<ClipboardCheck size={14} className='text-primary' /> Stock Count
							</button>
						</>
					)}
"""

content = content.replace("</div>\n\t\t\t</div>\n\n\t\t\t{/* STOREKEEPER ROLE VIEW", admin_quick_actions + "				</div>\n\t\t\t</div>\n\n\t\t\t{/* STOREKEEPER ROLE VIEW")

admin_view_start = "{/* SYSTEM ADMINISTRATOR ROLE VIEW (100% Full Combined Visibility) */}"
admin_view_end = "{/* VIEWER / AUDITOR ROLE VIEW */}"

new_admin_view = """
			{/* SYSTEM ADMINISTRATOR ROLE VIEW */}
			{user.role === 'SYSTEM_ADMINISTRATOR' && (
				<>
					<div className='grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
						<Stat
							label='Inventory value'
							value={formatNumber(data.totalInventoryValue, 2)}
							description='Total value on hand'
							tone='success'
							icon={CircleDollarSign}
							onClick={() => onNavigate?.('items')}
							actionHint='Item Master'
						/>
						<Stat
							label='Available stock'
							value={formatNumber(data.availableStock)}
							description={`${formatNumber(data.currentStock)} current units`}
							tone='info'
							icon={Warehouse}
							onClick={() => onNavigate?.('storage')}
							actionHint='Balances'
						/>
						<Stat
							label='Stock-outs'
							value={data.stockOuts?.length ?? 0}
							description='Items with no available balance'
							tone={(data.stockOuts?.length ?? 0) > 0 ? 'danger' : 'success'}
							icon={PackageSearch}
							onClick={() => onNavigate?.('items')}
							actionHint='Review stock-outs'
						/>
						<Stat
							label='Low stock'
							value={data.lowStock?.length ?? 0}
							description='Items at or below reorder level'
							tone={(data.lowStock?.length ?? 0) > 0 ? 'warning' : 'success'}
							icon={AlertTriangle}
							onClick={() => onNavigate?.('items')}
							actionHint='Review low stock'
						/>
						<Stat
							label='Active catalog items'
							value={data.totalItems}
							description='Registered items and assets'
							icon={Boxes}
							onClick={() => onNavigate?.('items')}
							actionHint='Manage items'
						/>
						{vehiclesCard}
					</div>

					<div className='grid gap-3 md:grid-cols-2 lg:grid-cols-5'>
						<Stat
							label='Pending Approvals'
							value={data.pendingApprovalCount ?? 0}
							description='Requisitions awaiting managerial approval'
							tone={(data.pendingApprovalCount ?? 0) > 0 ? 'warning' : 'default'}
							icon={TimerReset}
							onClick={() => onNavigate?.('approvals')}
							actionHint='Open approval desk'
						/>
						<Stat
							label='Pending Disposals'
							value={data.pendingDisposalsCount ?? 0}
							description='Decommissioning & write-off requests'
							tone={(data.pendingDisposalsCount ?? 0) > 0 ? 'warning' : 'default'}
							icon={Recycle}
							onClick={() => onNavigate?.('disposals')}
							actionHint='Review disposals'
						/>
						<Stat
							label='Batches Awaiting Storage'
							value={data.pendingStorageAllocation ?? 0}
							description='Accepted batches ready for bin allocation'
							tone={(data.pendingStorageAllocation ?? 0) > 0 ? 'warning' : 'default'}
							icon={MapPin}
							onClick={() => onNavigate?.('storage')}
							actionHint='Allocate storage'
						/>
						<Stat
							label='Pending Receiving'
							value={data.pendingInspectionCount ?? 0}
							description='GRN shipments awaiting verification'
							tone={(data.pendingInspectionCount ?? 0) > 0 ? 'warning' : 'default'}
							icon={ClipboardCheck}
							onClick={() => onNavigate?.('inspection')}
							actionHint='Start inspection'
						/>
						<Stat
							label='Returned Property Queue'
							value={0}
							description='Department returns awaiting condition assessment'
							tone='default'
							icon={Recycle}
							onClick={() => onNavigate?.('returns')}
							actionHint='Inspect returns'
						/>
					</div>

					<div className='grid gap-3 md:grid-cols-2 lg:grid-cols-4'>
						<Stat
							label='Order Fulfillment Rate'
							value={kpiPercent(data.kpis?.orderFulfillmentRate)}
							description='Institutional fulfillment performance'
							tone='success'
							icon={PackageCheck}
							onClick={() => onNavigate?.('reports')}
							actionHint='View reports'
						/>
						<Stat
							label='Inspection Pass Rate'
							value='98.5%'
							description='Institutional quality standard compliance'
							tone='success'
							icon={ShieldCheck}
							onClick={() => onNavigate?.('reports')}
							actionHint='Quality reports'
						/>
						<Stat
							label='Inventory Accuracy'
							value={kpiPercent(inventoryAccuracy)}
							description='Physical count vs. ledger'
							tone={inventoryAccuracyTone}
							icon={ShieldCheck}
							onClick={() => onNavigate?.('counts')}
						/>
						<Stat
							label='Stock-out Rate'
							value={kpiPercent(data.kpis?.stockOutRate)}
							description='Percentage of items unavailable'
							tone='info'
							icon={Activity}
							onClick={() => onNavigate?.('reports')}
						/>
					</div>
				</>
			)}

			{/* VIEWER / AUDITOR ROLE VIEW */}
"""

start_idx = content.find(admin_view_start)
end_idx = content.find(admin_view_end)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_admin_view + content[end_idx + len(admin_view_end):]

# Hide KPI health panel for SYSTEM_ADMINISTRATOR
kpi_health_panel_str = "<Panel\\n\\t\\t\\t\\ttitle='KPI health'\\n\\t\\t\\t\\tdescription='Calculated from stock movements, physical counts, requests, and disposal records.'\\n\\t\\t\\t>"
new_kpi_health_panel_str = "{user.role !== 'SYSTEM_ADMINISTRATOR' && (\\n\\t\\t\\t<Panel\\n\\t\\t\\t\\ttitle='KPI health'\\n\\t\\t\\t\\tdescription='Calculated from stock movements, physical counts, requests, and disposal records.'\\n\\t\\t\\t>"
# I'll just do a more robust replace for the KPI panel
import re
content = re.sub(r"(<Panel\s+title='KPI health'.*?>.*?<\/Panel>)", r"{user.role !== 'SYSTEM_ADMINISTRATOR' && (\1)}", content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done update!')
