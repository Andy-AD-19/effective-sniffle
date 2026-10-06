import re
import sys

with open('head_main.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Modify PieChartCard
pie_sig = "icon?: React.ComponentType<{ size?: number; className?: string }>\n})"
pie_sig_new = "icon?: React.ComponentType<{ size?: number; className?: string }>\n\tcompactEmpty?: boolean\n})"
content = content.replace(pie_sig, pie_sig_new)

pie_sig2 = "icon: Icon = BarChart3,\n}: {"
pie_sig2_new = "icon: Icon = BarChart3,\n\tcompactEmpty = false\n}: {"
content = content.replace(pie_sig2, pie_sig2_new)

pie_empty = "<div className='rounded-lg border border-dashed border-border bg-background/50 p-6 text-sm text-muted-foreground'>\n\t\t\t\t\tNo data for this chart.\n\t\t\t\t</div>"
pie_empty_new = "<div className={`rounded-lg border border-dashed border-border bg-background/50 p-6 text-sm text-muted-foreground ${compactEmpty ? '!p-3 flex items-center justify-center flex-1 min-h-[60px]' : ''}`}>\n\t\t\t\t\tNo data for this chart.\n\t\t\t\t</div>"
content = content.replace(pie_empty, pie_empty_new)

pie_section = "<section className='rounded-lg border border-border bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--surface-subtle)))] p-4 shadow-sm'>"
pie_section_new = "<section className='rounded-lg border border-border bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--surface-subtle)))] p-4 shadow-sm h-full flex flex-col'>"
content = content.replace(pie_section, pie_section_new)

pie_div1 = "<div className='mb-4 flex items-center justify-between gap-3'>"
pie_div1_new = "<div className='mb-4 flex items-center justify-between gap-3 shrink-0'>"
content = content.replace(pie_div1, pie_div1_new)

pie_div2 = "<div className='grid items-center gap-4 sm:grid-cols-[150px_1fr]'>"
pie_div2_new = "<div className='grid items-center gap-4 sm:grid-cols-[150px_1fr] flex-1'>"
content = content.replace(pie_div2, pie_div2_new)


# 2. Extract specific stats for the Admin block
def extract_stat(label, block_name=None):
    # simple regex to find the <Stat label='...' ... /> block
    pattern = r"(<Stat\s+label='" + re.escape(label) + r"'.*?/>)"
    matches = re.findall(pattern, content, re.DOTALL)
    if matches:
        return matches[0]
    return f"<!-- Stat {label} not found -->"

active_catalog = extract_stat('Active catalog items')
returned_property = extract_stat('Returned Property Queue')
inspection_pass = extract_stat('Inspection Pass Rate')
inspection_reports = extract_stat('Inspection Reports')

inventory_value = extract_stat('Inventory value')
available_stock = extract_stat('Available stock')
low_stock = extract_stat('Low stock')
stock_outs = extract_stat('Stock-outs')

pending_inspection = extract_stat('Pending inspection')
pending_storage = extract_stat('Pending storage')
pending_approval = extract_stat('Pending approval')
pending_disposals = extract_stat('Pending disposals')
custody_assigned = extract_stat('Custody assigned')

inv_acc = extract_stat('Inventory accuracy')
stock_rate = extract_stat('Stock-out rate')
order_fulfill = extract_stat('Order fulfillment')
dead_stock = extract_stat('Dead stock percentage')
disposal_rate = extract_stat('Disposal rate')
turnover = extract_stat('Turnover ratio')

admin_block = f"""
			{{/* SYSTEM ADMINISTRATOR ROLE VIEW (100% Full Combined Visibility) */}}
			{{user.role === 'SYSTEM_ADMINISTRATOR' && (
				<div className='flex flex-col gap-6'>
					<div>
						<div className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Key Figures</div>
						<div className='grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6'>
							{inventory_value}
							{available_stock}
							{low_stock}
							{stock_outs}
							{active_catalog}
							{{vehiclesCard}}
						</div>
					</div>

					<div>
						<div className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Action Queue</div>
						<div className='grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-8'>
							{pending_approval}
							{pending_storage}
							{pending_inspection}
							{pending_disposals}
							{returned_property}
							{custody_assigned}
							{inspection_pass}
							{inspection_reports}
						</div>
					</div>

					<div>
						<div className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Performance</div>
						<div className='grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6'>
							{inv_acc}
							{stock_rate}
							{order_fulfill}
							{dead_stock}
							{disposal_rate}
							{turnover}
						</div>
					</div>
				</div>
			)}}
"""

# Replace old SYSTEM_ADMINISTRATOR block
start_idx = content.find("{/* SYSTEM ADMINISTRATOR ROLE VIEW (100% Full Combined Visibility) */}")
end_idx = content.find("{/* VIEWER / AUDITOR ROLE VIEW */}")
content = content[:start_idx] + admin_block + "\n\t\t\t" + content[end_idx:]


# 3. Quick Actions
# Find the generic admin/viewer actions
qa_generic = "{(user.role === 'SYSTEM_ADMINISTRATOR' || user.role === 'VIEWER_AUDITOR') && ("
content = content.replace(qa_generic, "{user.role === 'VIEWER_AUDITOR' && (")

# Insert Admin specific quick actions
admin_qa = """
					{user.role === 'SYSTEM_ADMINISTRATOR' && (
						<>
							<button
								onClick={() => onNavigate?.('receipts')}
								className='inline-flex items-center gap-1.5 rounded border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/5'
							>
								<PackagePlus size={14} className='text-primary' /> + New GRN (Model 19)
							</button>
							<button
								onClick={() => onNavigate?.('issues')}
								className='inline-flex items-center gap-1.5 rounded border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/5'
							>
								<PackageCheck size={14} className='text-primary' /> Issue Goods (SIV)
							</button>
							<button
								onClick={() => onNavigate?.('counts')}
								className='inline-flex items-center gap-1.5 rounded border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/5'
							>
								<ClipboardCheck size={14} className='text-primary' /> Stock Count
							</button>
							<button
								onClick={() => onNavigate?.('issues')}
								className='inline-flex items-center gap-1.5 rounded border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20'
							>
								<Plus size={14} /> + Create Stock Request
							</button>
						</>
					)}
"""
content = content.replace("{user.role === 'VIEWER_AUDITOR' && (", admin_qa + "\t\t\t\t\t{user.role === 'VIEWER_AUDITOR' && (")

# 4. KPI Health Panel hide for admin
kpi_panel_start = "<Panel\n\t\t\t\ttitle='KPI health'"
kpi_panel_new = "{user.role !== 'SYSTEM_ADMINISTRATOR' && (\n\t\t\t<Panel\n\t\t\t\ttitle='KPI health'"
content = content.replace(kpi_panel_start, kpi_panel_new)

# Find the end of KPI Panel
kpi_panel_end_idx = content.find("</Panel>", content.find(kpi_panel_new)) + 8
content = content[:kpi_panel_end_idx] + "\n\t\t\t)}\n" + content[kpi_panel_end_idx:]


# 5. Charts block
charts_start = "<div className='grid gap-5 md:grid-cols-2 2xl:grid-cols-3'>"
charts_end = content.find("</div>\n\n\t\t\t<Panel\n\t\t\t\ttitle='Drill-down details'", content.find(charts_start)) + 6
original_charts = content[content.find(charts_start):charts_end]

admin_charts = """
			{user.role === 'SYSTEM_ADMINISTRATOR' ? (
				<div className='grid gap-5 grid-cols-1 md:grid-cols-3 lg:grid-cols-5'>
					<div className="md:col-span-2 lg:col-span-3">
						<PieChartCard title='Stock Status Distribution' rows={data.charts?.stockStatusDistribution ?? []} icon={Gauge} compactEmpty />
					</div>
					<div className="md:col-span-1 lg:col-span-2">
						<PieChartCard title='Inventory Value by Category' rows={data.charts?.inventoryValueByCategory ?? []} icon={Layers3} compactEmpty />
					</div>
					
					<div className="md:col-span-1 lg:col-span-2">
						<PieChartCard title='Inventory Value by Funding Source' rows={data.charts?.inventoryValueByFundingSource ?? []} icon={CircleDollarSign} compactEmpty />
					</div>
					<div className="md:col-span-1 lg:col-span-2">
						<PieChartCard title='Consumption by Department' rows={data.charts?.consumptionByDepartment ?? []} icon={Users} compactEmpty />
					</div>
					<div className="md:col-span-1 lg:col-span-1">
						<PieChartCard title='Disposal Reason Distribution' rows={data.charts?.disposalReasonDistribution ?? []} icon={Recycle} compactEmpty />
					</div>

					<div className="md:col-span-3 lg:col-span-5 grid gap-5 md:grid-cols-2">
						<LineChartCard title='Daily Consumption Trend' rows={data.charts?.dailyConsumptionTrend ?? []} icon={TrendingUp} xKey='date' />
						<LineChartCard title='Monthly Consumption Trend' rows={data.charts?.monthlyConsumptionTrend ?? []} icon={TrendingUp} xKey='month' />
					</div>
				</div>
			) : (
""" + original_charts.replace("\n", "\n\t") + "\n\t\t\t)}\n"

content = content[:content.find(charts_start)] + admin_charts + content[charts_end:]

# Apply changes
with open('apps/web/src/main.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Layout updated!")
