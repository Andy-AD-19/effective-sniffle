const fs = require("fs");
let code = fs.readFileSync("apps/web/src/main.tsx", "utf8");

const regex =
  /function AuditLogs\(\{ token \}: \{ token: string \}\) \{[\s\S]*?<\/Panel>\n\t\)\n\}/;

const newStr = `function AuditLogs({ token }: { token: string }) {
  	const [rows, setRows] = useState<any[]>([])
  	useEffect(() => {
  		request<any[]>('/audit-logs', token).then(setRows)
  	}, [token])

    const actionMap: Record<string, string> = {
      'count.open': 'Opened Physical Count',
      'count.submit': 'Submitted Physical Count',
      'grn.create': 'Created GRN',
      'grn.submitInspection': 'Submitted GRN Inspection',
      'issue.reject': 'Rejected Issue Request',
      'disposal.create': 'Created Disposal',
      'disposal.approve': 'Approved Disposal',
      'disposal.dispose': 'Completed Disposal',
    };

    const entityMap: Record<string, string> = {
      'PhysicalCount': 'Physical Count',
      'GoodsReceivingNote': 'GRN',
      'StockDisposal': 'Disposal Voucher',
      'IssueRequest': 'Issue Request',
      'Setting': 'System Settings'
    };

    const formatAction = (act: string) => {
      if (actionMap[act]) return actionMap[act];
      if (act.startsWith('master.')) return \`\${act.includes('.create') ? 'Created' : act.includes('.update') ? 'Updated' : 'Deleted'} Master Data\`;
      return act;
    };

  	return (
  		<Panel title='Audit Logs'>
  			<DataTable
  				rows={rows}
  				columns={[
  					{
  						key: 'createdAt',
  						label: 'Time',
  						render: (row) => new Date(row.createdAt).toLocaleString(),
  					},
  					{
  						key: 'actor',
  						label: 'Actor',
  						render: (row) => row.actor?.fullName ? \`\${row.actor.fullName} (\${row.actor.email})\` : (row.actorId ?? 'System'),
  					},
  					{ key: 'action', label: 'Action', render: (row) => formatAction(row.action) },
  					{ key: 'entityType', label: 'Entity', render: (row) => entityMap[row.entityType] || row.entityType },
            { key: 'details', label: 'Details', render: (row) => row.details || row.entityId || '-' },
  				]}
  			/>
  		</Panel>
  	)
  }`;

if (regex.test(code)) {
  fs.writeFileSync("apps/web/src/main.tsx", code.replace(regex, newStr));
  console.log("Success audit UI");
} else {
  console.log("Not found audit UI");
}
