import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
	Activity,
	Boxes,
	AlertTriangle,
	ArrowUpRight,
	BarChart3,
	Bell,
	BookOpen,
	Bookmark,
	Columns3,
	Command,
	CheckCircle2,
	ClipboardCheck,
	CircleDollarSign,
	Database,
	Download,
	FileDown,
	Gauge,
	HardDrive,
	HelpCircle,
	History,
	Image,
	Layers3,
	LayoutDashboard,
	LoaderCircle,
	LogOut,
	MapPin,
	PanelLeftClose,
	PanelLeftOpen,
	Printer,
	Moon,
	PackageCheck,
	PackageSearch,
	PackagePlus,
	Plus,
	Recycle,
	Search,
	ShieldCheck,
	SlidersHorizontal,
	Sparkles,
	Star,
	Sun,
	Text,
	TimerReset,
	TrendingUp,
	Upload,
	Warehouse,
	X,
	Users,
} from 'lucide-react'
import {
	buildOfflineQrLabelDataUrl,
	permissions,
	Permission,
	roleReportTypes,
	reportTypes,
	type ReportType,
	type RoleName,
} from '@fmoh/shared'
import { QRCodeSVG } from 'qrcode.react'
import { cn } from './lib/utils'
import {
	activateLicense,
	createDesktopBackup,
	deactivateCurrentDevice,
	deleteStoredValue,
	desktopApiUrl,
	getDesktopStatus,
	getLicenseStatus,
	isDesktop,
	listenDesktopMenu,
	notifyDesktop,
	openExternalFile,
	pickDatabaseBackupFile,
	pickFileAsBrowserFile,
	printCurrentView,
	readCachedValue,
	readStoredValue,
	restoreDesktopBackup,
	saveBlobFile,
	saveTextFile,
	toggleFullscreen,
	writeStoredValue,
	type DesktopStatus,
	type LicenseStatus,
} from './desktop'
import {
	buildModel19PrintDocument,
	buildModel22PrintDocument,
	buildSivPrintDocument,
	printHtmlDocument,
	type GrnPrintRecord,
	type SivPrintRecord,
} from './printTemplates'
import { SearchableSelect } from './components/SearchableSelect'
import './styles.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3001'

type User = {
	id: string
	email: string
	fullName: string
	role: RoleName
	permissions: Permission[]
	department?: { id: string; name: string }
}

type Session = { accessToken: string; user: User }
type AppView =
	| 'dashboard'
	| 'items'
	| 'receipts'
	| 'storage'
	| 'ledger'
	| 'bin-card'
	| 'issues'
	| 'returns'
	| 'approvals'
	| 'inspection'
	| 'counts'
	| 'adjustments'
	| 'disposals'
	| 'reports'
	| 'help'
	| 'settings'
	| 'master'
	| 'audit'
	| 'users'
type ToastTone = 'success' | 'error' | 'warning'
type ToastMessage = { id: number; tone: ToastTone; message: string }
type DataColumn = {
	key: string
	label: string
	render?: (row: any) => React.ReactNode
}
type HelpArticle = {
	id: string
	title: string
	category: string
	summary: string
	body: string[]
	related?: string[]
	next?: string
	time?: string
}

const roleLabels: Record<RoleName, string> = {
	SYSTEM_ADMINISTRATOR: 'System Administrator',
	STOREKEEPER: 'Storekeeper',
	DEPARTMENT_USER: 'Department User',
	APPROVER: 'Approver',
	INSPECTOR: 'Inspector',
	VIEWER_AUDITOR: 'Viewer / Auditor',
}

const roleNavViews: Record<RoleName, AppView[]> = {
	SYSTEM_ADMINISTRATOR: [
		'dashboard',
		'approvals',
		'inspection',
		'returns',
		'issues',
		'adjustments',
		'disposals',
		'reports',
		'master',
		'audit',
		'users',
		'settings',
		'help',
	],
	STOREKEEPER: [
		'dashboard',
		'items',
		'receipts',
		'storage',
		'ledger',
		'bin-card',
		'issues',
		'returns',
		'counts',
		'disposals',
		'reports',
		'help',
	],
	DEPARTMENT_USER: ['dashboard', 'issues', 'returns', 'reports', 'help'],
	APPROVER: [
		'dashboard',
		'approvals',
		'issues',
		'adjustments',
		'disposals',
		'ledger',
		'reports',
		'help',
	],
	INSPECTOR: [
		'dashboard',
		'inspection',
		'receipts',
		'returns',
		'ledger',
		'reports',
		'help',
	],
	VIEWER_AUDITOR: [
		'dashboard',
		'items',
		'ledger',
		'bin-card',
		'reports',
		'audit',
		'help',
	],
}

const viewRules: Record<
	AppView,
	{ anyPermissions?: Permission[]; roles?: RoleName[] }
> = {
	dashboard: { anyPermissions: [permissions.DASHBOARD_READ] },
	items: {
		anyPermissions: [permissions.ITEM_READ],
		roles: ['STOREKEEPER', 'VIEWER_AUDITOR'],
	},
	receipts: {
		anyPermissions: [permissions.RECEIPT_WRITE, permissions.INSPECTION_WRITE],
		roles: ['STOREKEEPER', 'INSPECTOR', 'SYSTEM_ADMINISTRATOR'],
	},
	storage: {
		anyPermissions: [permissions.STORAGE_WRITE],
		roles: ['STOREKEEPER'],
	},
	ledger: {
		anyPermissions: [permissions.LEDGER_READ],
		roles: ['STOREKEEPER', 'APPROVER', 'INSPECTOR', 'VIEWER_AUDITOR', 'SYSTEM_ADMINISTRATOR'],
	},
	'bin-card': {
		anyPermissions: [permissions.ITEM_READ, permissions.LEDGER_READ],
		roles: ['STOREKEEPER', 'VIEWER_AUDITOR'],
	},
	issues: {
		anyPermissions: [
			permissions.REQUEST_CREATE,
			permissions.ISSUE_APPROVE,
			permissions.ISSUE_EXECUTE,
		],
	},
	returns: {
		anyPermissions: [
			permissions.RETURN_CREATE,
			permissions.RETURN_READ,
			permissions.RETURN_INSPECT,
		],
	},
	approvals: {
		anyPermissions: [
			permissions.ISSUE_APPROVE,
			permissions.ADJUSTMENT_APPROVE,
			permissions.DISPOSAL_APPROVE,
		],
		roles: ['APPROVER', 'SYSTEM_ADMINISTRATOR'],
	},
	inspection: {
		anyPermissions: [
			permissions.INSPECTION_WRITE,
			permissions.RETURN_INSPECT,
		],
		roles: ['INSPECTOR', 'SYSTEM_ADMINISTRATOR'],
	},
	counts: { anyPermissions: [permissions.COUNT_WRITE], roles: ['STOREKEEPER'] },
	adjustments: {
		anyPermissions: [permissions.ADJUSTMENT_APPROVE],
		roles: ['SYSTEM_ADMINISTRATOR', 'APPROVER'],
	},
	disposals: {
		anyPermissions: [permissions.DISPOSAL_WRITE, permissions.DISPOSAL_APPROVE],
		roles: ['SYSTEM_ADMINISTRATOR', 'STOREKEEPER', 'APPROVER'],
	},
	reports: { anyPermissions: [permissions.REPORT_READ] },
	help: {},
	settings: {
		anyPermissions: [permissions.USER_MANAGE],
		roles: ['SYSTEM_ADMINISTRATOR'],
	},
	master: {
		anyPermissions: [permissions.USER_MANAGE],
		roles: ['SYSTEM_ADMINISTRATOR'],
	},
	audit: {
		anyPermissions: [permissions.AUDIT_READ],
		roles: ['SYSTEM_ADMINISTRATOR', 'VIEWER_AUDITOR'],
	},
	users: {
		anyPermissions: [permissions.USER_MANAGE],
		roles: ['SYSTEM_ADMINISTRATOR'],
	},
}

function hasPermission(user: User | undefined, permission: Permission) {
	return Boolean(user?.permissions?.includes(permission))
}

function canAccessView(view: string, user: User | undefined): view is AppView {
	if (!user || !(view in viewRules)) return false
	const rule = viewRules[view as AppView]
	const roleAllowed = !rule.roles?.length || rule.roles.includes(user.role)
	const permissionAllowed =
		!rule.anyPermissions?.length ||
		rule.anyPermissions.some((permission) => hasPermission(user, permission))
	return roleAllowed && permissionAllowed
}

function defaultViewForRole(user: User | undefined): AppView {
	if (!user) return 'dashboard'
	return (
		roleNavViews[user.role]?.find((candidate) =>
			canAccessView(candidate, user)
		) ?? 'dashboard'
	)
}

function reportsForRole(role: RoleName): ReportType[] {
	return roleReportTypes[role] ?? []
}

const ModalDepthContext = React.createContext(0)

const plainTerms: Record<string, string> = {
	item: 'An item is a product or supply you want to track.',
	batch: 'A batch is a group of products received together.',
	grn: 'GRN means Goods Receiving Note. It records delivered goods.',
	fifo: 'FIFO means first in, first out. Older stock is used first.',
	fefo: 'FEFO means first expiry, first out. Stock that expires soon is used first.',
	reorder: 'Reorder means stock is getting low and more may be needed.',
	ledger: 'The ledger is the history of all stock movements.',
	disposal: 'Disposal removes damaged, expired, or unusable stock.',
	approval: 'Approval means a permitted person confirms an action.',
}

const pageHelp: Record<string, HelpArticle> = {
	dashboard: {
		id: 'dashboard',
		title: 'Dashboard Help',
		category: 'Daily work',
		summary: 'Use the dashboard to see what needs attention today.',
		time: '2 minutes',
		next: 'Item Registration',
		related: ['Item Registration', 'Reports', 'Stock Rotation'],
		body: [
			'Purpose: This page gives a quick picture of stock value, low stock, expired items, pending work, and recent activity.',
			'Who uses it: Store keepers, approvers, auditors, and managers use it at the start of the day.',
			'When to use it: Open it after login and whenever you want to know what needs action.',
			'Before you begin: Make sure you are signed in with the right account.',
			'Steps: Review alerts, check low stock, open pending queues, then go to the page that needs action.',
			'Common mistake: Do not treat dashboard numbers as an edit screen. Use the related page to make changes.',
			'Tip: Use Search anything to quickly open a record or report.',
			'Warning: Red or amber cards need attention soon.',
			'Example: If Low Stock shows 7, open Reports or Item Registration to see what must be ordered.',
		],
	},
	items: {
		id: 'items',
		title: 'Item Registration Help',
		category: 'Inventory setup',
		summary: 'Create and update products before receiving or issuing them.',
		time: '4 minutes',
		next: 'Procurement / GRN',
		related: ['Goods Receiving', 'Storage & Coding', 'Reports'],
		body: [
			'Purpose: This page stores the master list of products and supplies.',
			'Who uses it: Store keepers and administrators use it before stock is received.',
			'When to use it: Use it when a new product must be tracked or an item name needs correction.',
			'Before you begin: Have the item name, category, unit, store, funding source, and reorder levels ready.',
			'Steps: Enter item code, description, type, category, unit, stock levels, tracking options, then click Register.',
			'Common mistake: Do not create the same item twice. Search first.',
			'Tip: Use Batch tracking when products arrive in groups that must be tracked separately.',
			'Warning: Some fields cannot be changed after the item has stock movement.',
			"Example: Create 'A4 printer paper ream' before receiving paper from a supplier.",
		],
	},
	receipts: {
		id: 'receipts',
		title: 'Goods Receiving Help',
		category: 'Receiving',
		summary: 'Record goods that have arrived at the warehouse.',
		time: '5 minutes',
		next: 'Inspection & Acceptance',
		related: ['Item Registration', 'Storage & Coding', 'Reports'],
		body: [
			'Purpose: Use this page when products arrive at your warehouse.',
			'Who uses it: Store keepers and receiving staff use it.',
			'When to use it: Use it when a supplier, donor, or government office delivers goods.',
			'Before you begin: Have supplier name, delivery note, order reference, item names, quantities, prices, batch numbers, and expiry dates.',
			'Steps: Select source type, select supplier, enter delivery information, add product lines, then save or submit for inspection.',
			'Common mistake: Entering received quantity as accepted quantity. Acceptance happens during inspection.',
			'Tip: If the supplier delivered fewer products, record the quantity actually received.',
			'Warning: Products usually move to Inspection before they become available.',
			'Example: A supplier delivers 500 boxes of gloves. Record the delivery here, then inspect the goods.',
		],
	},
	storage: {
		id: 'storage',
		title: 'Storage & Coding Help',
		category: 'Storage',
		summary: 'Put accepted stock into a store, shelf, and bin location.',
		time: '4 minutes',
		next: 'Stock Issue',
		related: ['Goods Receiving', 'Stock Rotation', 'Barcode/QR Label'],
		body: [
			'Purpose: This page tells the system exactly where accepted stock is kept.',
			'Who uses it: Store keepers use it after inspection.',
			'When to use it: Use it after goods are accepted and waiting for storage allocation.',
			'Before you begin: Know the store, room, shelf, bin, accepted batch, and quantity to place.',
			'Steps: Create shelf/bin locations if needed, select an accepted batch, choose the location, enter quantity, and assign storage.',
			'Common mistake: Assigning more than the remaining accepted quantity.',
			'Tip: Print or save the barcode/QR label after allocation.',
			'Warning: Stock is easier to find later when shelf and bin codes are accurate.',
			'Example: Put 200 packs of gloves in Main Store, Shelf 2, Bin 5.',
		],
	},
	ledger: {
		id: 'ledger',
		title: 'Stock Rotation and Monitoring Help',
		category: 'Stock control',
		summary: 'View stock movement, available quantities, and rotation.',
		time: '3 minutes',
		next: 'Physical Count',
		related: ['Storage & Coding', 'Stock Issue', 'Reports'],
		body: [
			'Purpose: This page shows stock movement history and balances.',
			'Who uses it: Store keepers, approvers, and auditors use it.',
			'When to use it: Use it to check available stock, movement, and FIFO/FEFO order.',
			'Before you begin: Search by item or batch if the list is long.',
			'Steps: Search, review quantities, check movement dates, and use the oldest or soonest-expiring stock first.',
			'Common mistake: Issuing newer stock while older stock is still available.',
			'Tip: Use FEFO for products with expiry dates.',
			'Warning: This page is for checking records, not editing them.',
			'Example: Use the batch expiring soonest before opening a newer batch.',
		],
	},
	'bin-card': {
		id: 'bin-card',
		title: 'Bin Card Help',
		category: 'Stock control',
		summary: "Review a single item's chronological stock card.",
		time: '3 minutes',
		next: 'Physical Count',
		related: ['Item Registration', 'Goods Receiving', 'Stock Issue'],
		body: [
			"Purpose: This page shows one item's stock history from registration through receipts, issues, and balance changes.",
			'Who uses it: Store keepers, auditors, and managers use it to verify movement history.',
			'When to use it: Use it when checking provider receipts, department issues, batch balances, and audit trail details.',
			'Before you begin: Search for the item by code or description.',
			'Steps: Find the item, open its bin card, review dates, references, provider, department, quantities received, quantities issued, and running balance.',
			'Common mistake: Do not use the bin card to edit stock. Corrections must be posted through approved receiving, issue, count, or reconciliation workflows.',
			'Tip: Print the card when supporting a physical count or audit review.',
			'Warning: Running balances depend on approved stock transactions.',
		],
	},
	issues: {
		id: 'issues',
		title: 'Stock Issue Help',
		category: 'Issuing',
		summary: 'Create, approve, issue, and acknowledge department requests.',
		time: '5 minutes',
		next: 'Returned Items',
		related: ['Stock Rotation', 'Returned Items', 'Model 22 Voucher'],
		body: [
			'Purpose: This page moves stock from the store to a department.',
			'Who uses it: Requesters, approvers, and store keepers use it.',
			'When to use it: Use it when a department needs supplies.',
			'Before you begin: Know the department, purpose, item, and requested quantity.',
			'Steps: Create request, approve it, issue stock with Model 22 voucher, then acknowledge receipt.',
			'Common mistake: Trying to issue stock before approval.',
			'Tip: Click "View Model 22" or "Print SIV" to inspect and print the official government issue voucher.',
			'Warning: The system prevents negative stock.',
			'Example: Administration requests 20 packs of paper. Approve and issue from available stock.',
		],
	},
	returns: {
		id: 'returns',
		title: 'Returned Items Help',
		category: 'Returns',
		summary: 'Return issued items to dedicated holding storage for inspection.',
		time: '4 minutes',
		next: 'Inspector Portal',
		related: ['Stock Issue', 'Inspector Portal', 'Storage & Coding'],
		body: [
			'Purpose: Track and receive items returned by departments after issuance.',
			'Who uses it: Department users, storekeepers, and inspectors.',
			'When to use it: When an issued item is unused, defective, or oversupplied.',
			'Before you begin: Reference the original Stock Issue Voucher (SIV) and note item condition.',
			'Steps: Click Initiate Return, select the issued voucher/request, choose item and return quantity, specify return reason, and submit.',
			'Important: Returned items are placed into the dedicated Returned Items Location (RET-HOLDING-01) under "Pending Inspection" status.',
			'Tip: Stock is not returned to main store balances until approved by an Inspector.',
		],
	},
	approvals: {
		id: 'approvals',
		title: 'Approver Portal Help',
		category: 'Approvals',
		summary: 'Supervise and authorize stock requests, adjustments, and disposals.',
		time: '3 minutes',
		next: 'Stock Issue',
		related: ['Stock Issue', 'Reconciliation', 'Disposal Management'],
		body: [
			'Purpose: Central approval hub for supervisors and designated approvers.',
			'Who uses it: Department approvers and management supervisors.',
			'When to use it: Review and approve/reject pending department issue requests, stock count adjustments, and disposal requests.',
			'Steps: Open pending tab, inspect requested quantities and justifications, then click Approve or Reject with comments.',
			'Note: Approvers do not conduct physical stock inspections; inspections are handled by the Inspector role.',
		],
	},
	inspection: {
		id: 'inspection',
		title: 'Inspector Portal Help',
		category: 'Inspection',
		summary: 'Physically inspect returned items and incoming goods with pass/fail outcomes.',
		time: '4 minutes',
		next: 'Storage & Coding',
		related: ['Returned Items', 'Goods Receiving', 'Storage & Coding'],
		body: [
			'Purpose: Dedicated inspection workstation for the physical inspection team.',
			'Who uses it: Inspectors and quality control officers.',
			'When to use it: Inspect items in the Returned Items Queue or GRN Goods Receiving Queue.',
			'Steps: Select a pending return, review original voucher details, inspect item quality, set accepted vs rejected quantities, choose restock destination store, and finalize inspection.',
			'Workflow: Accepted returned items are restocked into the active store location. Rejected items are quarantined with disposal ledger entries.',
		],
	},
	counts: {
		id: 'counts',
		title: 'Physical Inventory Count Help',
		category: 'Counting',
		summary: 'Compare real shelf quantities with system quantities.',
		time: '10 minutes',
		next: 'Stock Reconciliation',
		related: ['Stock Rotation', 'Reconciliation', 'Reports'],
		body: [
			'Purpose: This page helps you count real stock and compare it with the system.',
			'Who uses it: Store keepers and supervisors use it during monthly or annual counts.',
			'When to use it: Use it during scheduled stock checks or after a suspected error.',
			'Before you begin: Stop moving stock in the area being counted, if possible.',
			'Steps: Open count, count each item, enter counted quantity, submit count, and review variances.',
			'Common mistake: Counting after new stock was issued but before records were updated.',
			'Tip: Count by shelf and bin to avoid missing items.',
			'Warning: Differences may require approval before adjustment.',
			'Example: The system says 100 packs. You count 98. The variance is minus 2.',
		],
	},
	adjustments: {
		id: 'adjustments',
		title: 'Stock Reconciliation Help',
		category: 'Reconciliation',
		summary: 'Review and approve stock differences from counts.',
		time: '4 minutes',
		next: 'Disposal',
		related: ['Physical Count', 'Reports', 'Audit Logs'],
		body: [
			'Purpose: This page handles differences found during physical counts.',
			'Who uses it: Approvers and supervisors use it.',
			'When to use it: Use it after a submitted count has a difference.',
			'Before you begin: Review count notes and confirm the reason for the difference.',
			'Steps: Open pending adjustment, check item and quantity change, approve or reject it.',
			'Common mistake: Approving a difference without checking the count notes.',
			'Tip: Ask for a recount when the difference is large.',
			'Warning: Approved adjustments change stock balance.',
			'Example: A broken item is found missing and the adjustment removes one unit.',
		],
	},
	disposals: {
		id: 'disposals',
		title: 'Disposal Management Help',
		category: 'Disposal',
		summary: 'Remove damaged, expired, or unusable stock from inventory.',
		time: '5 minutes',
		next: 'Reports',
		related: ['Stock Rotation', 'Reports', 'Audit Logs'],
		body: [
			'Purpose: This page records stock that should no longer be used.',
			'Who uses it: Store keepers and approval committees use it.',
			'When to use it: Use it for expired, damaged, obsolete, or unusable products.',
			'Before you begin: Know the item, batch, location, quantity, and disposal reason.',
			'Steps: Create disposal request, wait for approval, then complete disposal.',
			'Common mistake: Disposing stock before approval.',
			'Tip: Add a clear reason so auditors understand the record.',
			'Warning: Disposal removes stock from available quantity.',
			'Example: Dispose 5 damaged boxes from Batch A after committee approval.',
		],
	},
	reports: {
		id: 'reports',
		title: 'Reports Help',
		category: 'Reporting',
		summary: 'Preview, print, and export inventory records as PDF or Excel.',
		time: '3 minutes',
		next: 'User Management',
		related: ['Dashboard', 'Stock Ledger', 'Audit Logs'],
		body: [
			'Purpose: This page creates official reports for review, PDF export, Excel export, printing, and sharing.',
			'Who uses it: Store keepers, managers, auditors, and administrators use it.',
			'When to use it: Use it when you need stock status, receipts, issues, valuation, count, or audit information.',
			'Before you begin: Choose report type and filters such as date or item.',
			'Steps: Select report, enter filters, preview, then export PDF or Excel.',
			'Common mistake: Exporting before previewing the correct report.',
			'Tip: Favorite reports you use often.',
			'Warning: Reports show records based on your filters.',
			'Example: Export the stock status report at month end.',
		],
	},
	users: {
		id: 'users',
		title: 'User Management Help',
		category: 'Administration',
		summary: 'Create users, roles, and access rules.',
		time: '4 minutes',
		next: 'Dashboard',
		related: ['Audit Logs', 'Configuration'],
		body: [
			'Purpose: This page controls who can use the system and what they can do.',
			'Who uses it: System administrators use it.',
			'When to use it: Use it when staff join, change roles, or leave.',
			"Before you begin: Know the person's name, email, role, and department.",
			'Steps: Add user, choose role, assign department, and save.',
			'Common mistake: Giving more access than the person needs.',
			'Tip: Use Viewer/Auditor for read-only review.',
			'Warning: Administrator access should be limited.',
			'Example: Create a Storekeeper account for a new warehouse officer.',
		],
	},
	master: {
		id: 'master',
		title: 'Configuration Help',
		category: 'Administration',
		summary: 'Maintain categories, stores, departments, suppliers, and units.',
		time: '4 minutes',
		next: 'Item Registration',
		related: ['Item Registration', 'User Management'],
		body: [
			'Purpose: This page stores lists used by other pages.',
			'Who uses it: Administrators and senior store keepers use it.',
			'When to use it: Use it before creating items, receiving goods, or assigning users.',
			'Before you begin: Know the exact name and code you want to add.',
			'Steps: Choose list, enter details, save, then use it on other pages.',
			'Common mistake: Creating duplicate names with different spelling.',
			'Tip: Keep codes short and clear.',
			'Warning: Changing master data can affect future records.',
			'Example: Add a new supplier before recording a delivery from that supplier.',
		],
	},
	audit: {
		id: 'audit',
		title: 'Audit Logs Help',
		category: 'Administration',
		summary: 'See who changed what and when.',
		time: '3 minutes',
		next: 'Reports',
		related: ['Reports', 'User Management'],
		body: [
			'Purpose: This page keeps a history of important actions.',
			'Who uses it: Auditors, administrators, and supervisors use it.',
			'When to use it: Use it when you need to review changes or investigate a mistake.',
			'Before you begin: Know the date, user, or record you are looking for.',
			'Steps: Search or filter, open the matching action, and review details.',
			'Common mistake: Expecting audit logs to edit records. They only show history.',
			'Tip: Use reports if you need to export records.',
			'Warning: Audit history should not be deleted.',
			'Example: Check who approved a disposal request.',
		],
	},
}

const workflowHelp = [
	[
		'Login',
		'Sign in so the system knows who you are.',
		'All users',
		'Email and password',
		'Open Dashboard',
	],
	[
		'Dashboard',
		'Check daily stock health and pending work.',
		'All users',
		'No extra information',
		'Open the task page',
	],
	[
		'Item Registration',
		'Create products before stock is received.',
		'Store keeper',
		'Item name, category, unit',
		'Receive goods',
	],
	[
		'Procurement / Donation',
		'Record where goods came from.',
		'Store keeper',
		'Supplier or donor details',
		'Create GRN',
	],
	[
		'Goods Receiving',
		'Record delivered goods.',
		'Store keeper',
		'Delivery note, quantity, batch',
		'Inspect goods',
	],
	[
		'Inspection',
		'Accept or reject received goods.',
		'Inspector or store keeper',
		'Received quantity and condition',
		'Store accepted goods',
	],
	[
		'Storage',
		'Put accepted stock in shelf and bin locations.',
		'Store keeper',
		'Store, shelf, bin, quantity',
		'Stock becomes available',
	],
	[
		'Stock Issue',
		'Give stock to a department.',
		'Requester, approver, store keeper',
		'Department, item, quantity',
		'Monitor stock',
	],
	[
		'Inventory Monitoring',
		'Watch low stock, expiry, and movement.',
		'Store keeper',
		'Item or date filters',
		'Count stock',
	],
	[
		'Physical Inventory Count',
		'Compare real stock with system stock.',
		'Store keeper',
		'Counted quantity',
		'Reconcile differences',
	],
	[
		'Stock Reconciliation',
		'Approve stock differences.',
		'Approver',
		'Variance reason',
		'Dispose if needed',
	],
	[
		'Disposal',
		'Remove unusable stock.',
		'Store keeper and approver',
		'Reason and quantity',
		'Report results',
	],
	[
		'Reports',
		'Preview, print, PDF export, and Excel export records.',
		'All permitted users',
		'Report type and filters',
		'Share or file report',
	],
]

const troubleshootingArticles: HelpArticle[] = [
	{
		id: 'cannot-login',
		title: 'Cannot login',
		category: 'Troubleshooting',
		summary: 'Fix common sign-in problems.',
		body: [
			'Check that your email is correct.',
			'Make sure Caps Lock is off.',
			'Ask an administrator to confirm your account is active.',
			'If you forgot your password, ask an administrator to reset it.',
		],
	},
	{
		id: 'barcode-not-printing',
		title: 'Barcode or QR code not printing',
		category: 'Troubleshooting',
		summary: 'Steps to print labels again.',
		body: [
			'Check that the printer is on.',
			'Check paper or label roll.',
			'Open the label preview again.',
			'Try Print preview from your browser.',
			'If it still fails, save the page as PDF and print it.',
		],
	},
	{
		id: 'wrong-quantity',
		title: 'Wrong quantity entered',
		category: 'Troubleshooting',
		summary: 'What to do when a number is wrong.',
		body: [
			'If the record is still draft, edit the quantity.',
			'If it was approved or posted, do not create a fake record.',
			'Use Physical Count and Reconciliation if stock balance must be corrected.',
			'Write a clear note explaining the mistake.',
		],
	},
	{
		id: 'duplicate-item',
		title: 'Duplicate item',
		category: 'Troubleshooting',
		summary: 'Avoid creating the same item twice.',
		body: [
			'Search by item name and code first.',
			'If the item exists, edit the existing item instead.',
			'If the duplicate has no movement, ask an administrator to deactivate it.',
			'Use one standard item name going forward.',
		],
	},
	{
		id: 'app-slow',
		title: 'Application is slow',
		category: 'Troubleshooting',
		summary: 'Simple steps to improve speed.',
		body: [
			'Close pages you are not using.',
			'Use search filters instead of loading very large lists.',
			'Restart the application if it has been open for many hours.',
			'Tell support if the same page is always slow.',
		],
	},
	{
		id: 'power-outage',
		title: 'Power outage or unexpected shutdown',
		category: 'Troubleshooting',
		summary: 'Recover after sudden shutdown.',
		body: [
			'Open the application again.',
			'Check the last record you were working on.',
			'If a save message did not appear, enter the record again.',
			'Use Audit Logs to confirm what was saved.',
		],
	},
]

const baseFaqs = [
	'How do I create a new item?',
	'How do I receive deliveries?',
	'What if the supplier delivered fewer products?',
	'What if I entered the wrong quantity?',
	'Can I edit an approved record?',
	'How do I print reports?',
	'How do I search?',
	'How do I find expired products?',
	'How do I dispose damaged products?',
	'What does Batch Number mean?',
	'What happens after Inspection?',
	"Why can't I delete this record?",
	'How do I transfer products?',
	'How do I backup data?',
	'Why is an item not available for issue?',
]

const faqArticles: HelpArticle[] = Array.from({ length: 150 }, (_, index) => {
	const module = workflowHelp[index % workflowHelp.length][0]
	const question = baseFaqs[index % baseFaqs.length]
	return {
		id: `faq-${index + 1}`,
		title: `${question} (${module})`,
		category: 'FAQ',
		summary: `Simple answer for ${module.toLowerCase()}.`,
		body: [
			'Short answer: Start from the correct page, read the visible fields, and follow the buttons from left to right.',
			`For ${module}, make sure the required information is ready before you save.`,
			'If the system shows a warning, fix the missing or wrong field and try again.',
			'When the save or success message appears, the record has moved to the next step.',
		],
		related: [module],
	}
})

const manualArticles: HelpArticle[] = [
	{
		id: 'welcome',
		title: 'Welcome',
		category: 'Manual',
		summary: 'Start here if this is your first time.',
		body: [
			'This system helps you track products from delivery to storage, issue, count, disposal, and reporting.',
			'You do not need to know special software terms. Each page tells you what to do next.',
			'Use Help when you are unsure.',
		],
	},
	{
		id: 'quick-start',
		title: 'Quick Start Guide',
		category: 'Manual',
		summary: 'A short path for daily work.',
		body: [
			'1. Login.',
			'2. Check Dashboard alerts.',
			'3. Register new items if needed.',
			'4. Record goods that arrived.',
			'5. Inspect the goods.',
			'6. Store accepted goods.',
			'7. Issue stock to departments.',
			'8. Run reports at the end of the day.',
		],
	},
	{
		id: 'workflow-guide',
		title: 'Illustrated Workflow Guide',
		category: 'Manual',
		summary: 'Learn the full stock workflow.',
		body: workflowHelp.map(
			(row, index) => `${index + 1}. ${row[0]}: ${row[1]} Next: ${row[4]}.`
		),
	},
	{
		id: 'glossary',
		title: 'Glossary',
		category: 'Manual',
		summary: 'Plain English meanings of common words.',
		body: Object.entries(plainTerms).map(
			([term, meaning]) => `${term}: ${meaning}`
		),
	},
	{
		id: 'keyboard-shortcuts',
		title: 'Keyboard Shortcuts',
		category: 'Manual',
		summary: 'Fast ways to move around.',
		body: [
			'Ctrl+K: Open global search.',
			'Escape: Close a help panel or dialog.',
			'Tab: Move to the next field.',
			'Shift+Tab: Move to the previous field.',
			'Enter: Activate the selected button when focused.',
		],
	},
	{
		id: 'administrator-guide',
		title: 'Administrator Guide',
		category: 'Manual',
		summary: 'Basic administration tasks.',
		body: [
			'Create only the users who need access.',
			'Give each user the smallest role that lets them do their work.',
			'Keep departments, suppliers, stores, categories, and units clean.',
			'Review audit logs when a record looks wrong.',
		],
	},
	{
		id: 'revision-history',
		title: 'Revision History',
		category: 'Manual',
		summary: 'Help system history.',
		body: [
			'2026-07-19: Added built-in three-level help system, searchable manual, FAQ, troubleshooting, and guided tour.',
		],
	},
]

const helpArticles = [
	...Object.values(pageHelp),
	...manualArticles,
	...troubleshootingArticles,
	...faqArticles,
]

async function request<T>(
	path: string,
	token?: string,
	init?: RequestInit
): Promise<T> {
	const baseUrl = await apiBaseUrl()
	const isFormData = init?.body instanceof FormData
	const response = await fetch(`${baseUrl}/api${path}`, {
		...init,
		headers: {
			...(isFormData ? {} : { 'Content-Type': 'application/json' }),
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(init?.headers ?? {}),
		},
	})
	if (response.status === 401 && !path.startsWith('/auth/login')) {
		await deleteStoredValue('fmoh-session')
		window.dispatchEvent(new CustomEvent('fmoh-auth-expired'))
	}
	if (!response.ok) throw new Error(await friendlyResponseError(response))
	return response.json()
}

async function apiBaseUrl() {
	return isDesktop() ? await desktopApiUrl() : API_URL
}

async function friendlyResponseError(response: Response) {
	const raw = await response.text()
	if (!raw) return `Request failed with status ${response.status}.`
	try {
		const parsed = JSON.parse(raw)
		const message = Array.isArray(parsed.message)
			? parsed.message.join(' ')
			: parsed.message
		return typeof message === 'string' && message.trim() ? message : raw
	} catch {
		return raw
	}
}

function fileUrl(fileId?: string) {
	return fileId ? `${API_URL}/api/uploads/${fileId}` : ''
}

function cachedValue<T>(key: string, fallback: T): T {
	const raw = readCachedValue(key)
	if (!raw) return fallback
	try {
		return JSON.parse(raw) as T
	} catch {
		return raw as T
	}
}

async function uploadFile(token: string, file: File, category: string) {
	if (isDesktop()) {
		return {
			id: `local-file-${Date.now()}`,
			originalName: file.name,
			storedName: file.name,
			mimeType: file.type || 'application/octet-stream',
			size: file.size,
			path: '',
			category,
		}
	}
	const data = new FormData()
	data.append('file', file)
	data.append('category', category)
	return request<any>('/uploads', token, { method: 'POST', body: data })
}

function newStorageLocationForm() {
	const suffix = Date.now().toString().slice(-5)
	return {
		id: '',
		locationCode: `STORE-A-S${suffix}-B1`,
		gln: '',
		roomOrZone: 'Store A',
		shelfNumber: suffix,
		rackNumber: 'R1',
		binNumber: '1',
		description: `Store A, Shelf ${suffix}, Bin 1`,
	}
}

function notify(tone: ToastTone, message: string) {
	window.dispatchEvent(
		new CustomEvent('fmoh-toast', { detail: { tone, message } })
	)
	if (tone === 'success' || tone === 'warning')
		void notifyDesktop('FMOH Inventory', message)
}

function errorMessage(err: unknown, fallback: string) {
	const rawInput =
		err instanceof Error
			? err.message
			: typeof err === 'string'
				? err
				: fallback
	let raw = rawInput
	try {
		const parsed = JSON.parse(rawInput)
		const message = Array.isArray(parsed.message)
			? parsed.message.join(' ')
			: parsed.message
		raw = typeof message === 'string' && message.trim() ? message : rawInput
	} catch {
		raw = rawInput
	}
	const friendlyRules: Array<[RegExp, string]> = [
		[
			/stock issuance only allows active items/i,
			'This item is inactive and cannot be issued. Please choose an active item or reactivate it before issuing stock.',
		],
		[
			/inactive item|item is inactive|only active items/i,
			'This item is inactive. Please choose an active item or reactivate it before continuing.',
		],
		[
			/insufficient|exceeds available|negative stock|not enough stock/i,
			'There is not enough available stock for this action. Check the quantity and storage location, then try again.',
		],
		[
			/expiry date.*required|expiry.*required/i,
			'Expiry date is required for this item. Enter the expiry date before saving.',
		],
		[
			/batch.*required/i,
			'Batch number is required for this item. Enter the batch number before saving.',
		],
		[
			/permission|unauthorized|forbidden/i,
			'Your account does not have permission to do this. Ask an administrator if you need access.',
		],
		[
			/foreign key|constraint/i,
			'This record uses information that is missing. Please choose a valid item, supplier, store, or user from the list.',
		],
		[
			/already used|inventory transaction/i,
			'This record cannot be deleted because it is already used in an inventory transaction. Deactivate it instead to remove it from normal use.',
		],
		[
			/unique|duplicate/i,
			'This record already exists. Search for it first, then edit the existing record if needed.',
		],
		[
			/not found|no .* found/i,
			'The record could not be found. Refresh the page and try again.',
		],
		[
			/network|failed to fetch/i,
			'The application could not reach the local service. Check that the app is running and try again.',
		],
		[
			/bad request|statuscode|status code|^\{.*\}$/i,
			'The app could not complete this action. Please check the form details and try again.',
		],
		[
			/required|missing/i,
			'Some required information is missing. Check the highlighted fields and try again.',
		],
	]
	return friendlyRules.find(([pattern]) => pattern.test(raw))?.[1] ?? raw
}

function useSmartTooltips() {
	useEffect(() => {
		const tooltip = document.createElement('div')
		tooltip.className = 'smart-tooltip'
		tooltip.setAttribute('role', 'tooltip')
		document.body.appendChild(tooltip)

		const explain = (element: Element) => {
			const existing =
				element.getAttribute('data-tooltip') || element.getAttribute('title')
			if (existing) {
				element.setAttribute('data-tooltip', existing)
				element.removeAttribute('title')
				return existing
			}
			const input = element as HTMLInputElement
			const text = element.textContent?.trim().replace(/\s+/g, ' ')
			const placeholder = input.placeholder
			const label =
				element.getAttribute('aria-label') ?? placeholder ?? text ?? ''
			if (!label) return ''
			const lower = label.toLowerCase()
			let tip = `${label}. Use this control to continue your task.`
			if (lower.includes('search'))
				tip = 'Search. Type a word or number to find matching records.'
			else if (
				lower.includes('export') ||
				lower.includes('excel') ||
				lower.includes('pdf')
			)
				tip = 'Export. Creates a file you can save, print, or share.'
			else if (
				lower.includes('save') ||
				lower.includes('register') ||
				lower.includes('create')
			)
				tip = 'Save. Stores the information you entered.'
			else if (lower.includes('approve'))
				tip = 'Approve. Confirms this record so the next step can continue.'
			else if (lower.includes('reject'))
				tip = 'Reject. Stops this request and records the reason.'
			else if (lower.includes('deactivate'))
				tip =
					'Deactivate. Hides this record from normal use without deleting history.'
			else if (lower.includes('batch'))
				tip = 'Batch number. Identifies products received together.'
			else if (lower.includes('quantity'))
				tip = 'Quantity. Enter the number of units for this record.'
			else if (lower.includes('sidebar') || lower.includes('collapse'))
				tip = 'Sidebar. Show or hide the module menu.'
			else if (lower.includes('notification'))
				tip = 'Notifications. Shows alerts that may need action.'
			element.setAttribute('data-tooltip', tip.slice(0, 150))
			return tip.slice(0, 150)
		}
		const apply = () =>
			document
				.querySelectorAll(
					"button,input,select,textarea,summary,[role='button'],.status-pill,[title]"
				)
				.forEach(explain)
		const hide = () => tooltip.classList.remove('smart-tooltip-visible')
		const show = (event: Event) => {
			const target =
				event.target instanceof Element
					? event.target.closest(
							"[data-tooltip],button,input,select,textarea,summary,[role='button'],.status-pill,[title]"
						)
					: null
			if (!target) return hide()
			const tip = explain(target)
			if (!tip) return hide()
			tooltip.textContent = tip
			tooltip.classList.add('smart-tooltip-visible')
			const rect = target.getBoundingClientRect()
			const tooltipRect = tooltip.getBoundingClientRect()
			const gap = 10
			let left = rect.left + rect.width / 2 - tooltipRect.width / 2
			left = Math.max(
				8,
				Math.min(left, window.innerWidth - tooltipRect.width - 8)
			)
			let top = rect.bottom + gap
			if (top + tooltipRect.height > window.innerHeight - 8)
				top = rect.top - tooltipRect.height - gap
			if (top < 8) top = 8
			tooltip.style.left = `${left}px`
			tooltip.style.top = `${top}px`
		}
		apply()
		const observer = new MutationObserver(apply)
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['title'],
		})
		document.addEventListener('pointerover', show)
		document.addEventListener('focusin', show)
		document.addEventListener('pointerout', hide)
		document.addEventListener('focusout', hide)
		window.addEventListener('scroll', hide, true)
		window.addEventListener('resize', hide)
		return () => {
			observer.disconnect()
			document.removeEventListener('pointerover', show)
			document.removeEventListener('focusin', show)
			document.removeEventListener('pointerout', hide)
			document.removeEventListener('focusout', hide)
			window.removeEventListener('scroll', hide, true)
			window.removeEventListener('resize', hide)
			tooltip.remove()
		}
	}, [])
}

function LoadingInline({
	label,
	loadingLabel,
	loading,
}: {
	label: React.ReactNode
	loadingLabel?: React.ReactNode
	loading: boolean
}) {
	return (
		<span className='inline-flex items-center justify-center gap-2'>
			{loading && <LoaderCircle className='animate-spin' size={16} />}
			{loading ? (loadingLabel ?? label) : label}
		</span>
	)
}

function ToastViewport() {
	const [toasts, setToasts] = useState<ToastMessage[]>([])
	useEffect(() => {
		const onToast = (event: Event) => {
			const detail = (
				event as CustomEvent<{ tone: ToastTone; message: string }>
			).detail
			const toast = {
				id: Date.now() + Math.random(),
				tone: detail.tone,
				message: detail.message,
			}
			setToasts((current) => [...current.slice(-3), toast])
			window.setTimeout(
				() =>
					setToasts((current) =>
						current.filter((item) => item.id !== toast.id)
					),
				4500
			)
		}
		window.addEventListener('fmoh-toast', onToast)
		return () => window.removeEventListener('fmoh-toast', onToast)
	}, [])
	return (
		<div className='fixed right-4 top-4 z-50 grid w-[min(380px,calc(100vw-2rem))] gap-2'>
			{toasts.map((toast) => {
				const Icon = toast.tone === 'success' ? CheckCircle2 : AlertTriangle
				const toneClass =
					toast.tone === 'success'
						? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
						: toast.tone === 'warning'
							? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200'
							: 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200'
				return (
					<div
						key={toast.id}
						className={cn(
							'flex items-start gap-2 rounded-md border px-3 py-2 text-sm shadow-lg backdrop-blur',
							toneClass
						)}
					>
						<Icon className='mt-0.5 shrink-0' size={16} />
						<p>{toast.message}</p>
					</div>
				)
			})}
		</div>
	)
}

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
	const [email, setEmail] = useState('admin@fmoh.local')
	const [password, setPassword] = useState('Password123!')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	async function submit(event: React.FormEvent) {
		event.preventDefault()
		setLoading(true)
		setError('')
		try {
			const session = await request<Session>('/auth/login', undefined, {
				method: 'POST',
				body: JSON.stringify({ email, password }),
			})
			void writeStoredValue('fmoh-session', session)
			notify('success', 'Signed in successfully.')
			onLogin(session)
		} catch (err) {
			const message = errorMessage(err, 'Unable to sign in')
			setError(message)
			notify('error', message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<main className='relative grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,.20),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,.18),transparent_32%),hsl(var(--background))] px-4'>
			<svg
				className='pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-20'
				viewBox='0 0 260 220'
				preserveAspectRatio='none'
				aria-hidden='true'
			>
				<path
					d='M18 170 C70 34 120 184 164 82 S226 22 252 100'
					fill='none'
					stroke='currentColor'
					strokeWidth='12'
					strokeLinecap='round'
				/>
				<path
					d='M36 192 C80 118 128 196 176 132 S226 88 258 146'
					fill='none'
					stroke='currentColor'
					strokeWidth='5'
					strokeLinecap='round'
				/>
			</svg>
			<form
				onSubmit={submit}
				className='relative w-full max-w-sm overflow-hidden rounded-lg border border-border bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--surface-subtle)))] p-6 shadow-xl'
			>
				<div className='mb-5 flex items-center gap-3'>
					<span className='grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary'>
						<Boxes size={22} />
					</span>
					<div>
						<h1 className='text-xl font-semibold'>FMOH Inventory</h1>
						<p className='mt-1 text-sm text-muted-foreground'>
							Institutional stock management console
						</p>
					</div>
				</div>
				<label className='mt-6 block text-sm font-medium'>
					Email
					<input
						className='mt-2 w-full rounded-md border border-border bg-background px-3 py-2'
						placeholder='Enter your email address'
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
				</label>
				<label className='mt-4 block text-sm font-medium'>
					Password
					<input
						className='mt-2 w-full rounded-md border border-border bg-background px-3 py-2'
						type='password'
						placeholder='Enter your password'
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
				</label>
				{error && (
					<p className='mt-4 rounded border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger'>
						{error}
					</p>
				)}
				<button
					className='mt-6 w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground shadow-sm'
					disabled={loading}
				>
					<LoadingInline
						loading={loading}
						label='Sign in'
						loadingLabel='Signing in...'
					/>
				</button>
				<p className='mt-4 text-xs text-muted-foreground'>
					Seed users: admin, storekeeper, requester, approver, auditor
					@fmoh.local
				</p>
			</form>
		</main>
	)
}

function Stat({
	label,
	value,
	description,
	tone = 'default',
	icon: Icon = Activity,
}: {
	label: string
	value: React.ReactNode
	description?: string
	tone?: 'default' | 'info' | 'success' | 'warning' | 'danger'
	icon?: React.ComponentType<{ size?: number; className?: string }>
}) {
	const toneClass = {
		default: {
			card: 'border-slate-500/25 bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--surface-subtle)))]',
			icon: 'bg-slate-500/15 text-slate-400',
			accent: 'from-slate-400 to-cyan-300',
		},
		info: {
			card: 'border-sky-500/30 bg-[linear-gradient(135deg,rgba(14,165,233,.16),hsl(var(--surface))_56%,rgba(99,102,241,.10))]',
			icon: 'bg-sky-500/20 text-sky-300',
			accent: 'from-sky-400 to-indigo-400',
		},
		success: {
			card: 'border-emerald-500/30 bg-[linear-gradient(135deg,rgba(16,185,129,.17),hsl(var(--surface))_55%,rgba(20,184,166,.10))]',
			icon: 'bg-emerald-500/20 text-emerald-300',
			accent: 'from-emerald-400 to-teal-300',
		},
		warning: {
			card: 'border-amber-500/40 bg-[linear-gradient(135deg,rgba(245,158,11,.18),hsl(var(--surface))_56%,rgba(251,191,36,.10))]',
			icon: 'bg-amber-500/20 text-amber-300',
			accent: 'from-amber-300 to-orange-400',
		},
		danger: {
			card: 'border-rose-500/40 bg-[linear-gradient(135deg,rgba(244,63,94,.18),hsl(var(--surface))_56%,rgba(239,68,68,.10))]',
			icon: 'bg-rose-500/20 text-rose-300',
			accent: 'from-rose-300 to-red-400',
		},
	}[tone]
	return (
		<div
			className={cn(
				'relative min-h-[118px] overflow-hidden rounded-lg border p-4 shadow-sm',
				toneClass.card
			)}
		>
			<svg
				className='pointer-events-none absolute -right-4 -top-5 h-24 w-24 opacity-20'
				viewBox='0 0 96 96'
				aria-hidden='true'
			>
				<path
					d='M12 60 C26 30 41 76 56 42 S77 22 88 38'
					fill='none'
					stroke='currentColor'
					strokeWidth='6'
					strokeLinecap='round'
				/>
				<circle cx='20' cy='62' r='4' fill='currentColor' />
				<circle cx='56' cy='42' r='4' fill='currentColor' />
				<circle cx='86' cy='38' r='4' fill='currentColor' />
			</svg>
			<div className='relative flex items-start justify-between gap-3'>
				<div className='min-w-0'>
					<p className='text-[11px] font-semibold uppercase text-muted-foreground'>
						{label}
					</p>
					<p className='mt-3 text-2xl font-semibold tracking-tight'>{value}</p>
				</div>
				<span
					className={cn(
						'grid h-10 w-10 shrink-0 place-items-center rounded-lg',
						toneClass.icon
					)}
				>
					<Icon size={20} />
				</span>
			</div>
			{description && (
				<p className='relative mt-2 text-xs text-muted-foreground'>
					{description}
				</p>
			)}
			<div
				className={cn(
					'absolute inset-x-4 bottom-0 h-1 rounded-t-full bg-gradient-to-r',
					toneClass.accent
				)}
			/>
		</div>
	)
}

function plainText(value: React.ReactNode) {
	if (typeof value === 'string' || typeof value === 'number')
		return String(value)
	return undefined
}

function formatStatus(value: string | null | undefined) {
	return String(value ?? 'N/A')
		.replaceAll('_', ' ')
		.toLowerCase()
		.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function StatusPill({ value }: { value: string | null | undefined }) {
	return (
		<span className='status-pill' title={formatStatus(value)}>
			{formatStatus(value)}
		</span>
	)
}

function DataTable(props: {
	rows: any[]
	columns: DataColumn[]
	empty?: string
	bulkDelete?: {
		label?: string
		onDeleteSelected: (rows: any[]) => Promise<void>
	}
}) {
	const modalDepth = React.useContext(ModalDepthContext)
	const [open, setOpen] = useState(false)
	const rowCount = props.rows.length
	const listName =
		props.columns
			.slice(0, 2)
			.map((column) => column.label)
			.join(' / ') || 'Records'
	if (modalDepth === 0) {
		return (
			<div className='rounded-lg border border-border bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--surface-subtle)))] p-3 shadow-sm'>
				<div className='flex flex-wrap items-center justify-between gap-3'>
					<div className='min-w-0'>
						<p className='text-sm font-semibold'>List available</p>
						<p className='mt-1 text-xs text-muted-foreground'>
							{rowCount} record{rowCount === 1 ? '' : 's'} - {listName}
						</p>
					</div>
					<button
						type='button'
						className='inline-flex items-center gap-2 rounded border border-border bg-background/70 px-3 py-2 text-sm font-semibold hover:bg-primary/10'
						onClick={() => setOpen(true)}
					>
						<Columns3 size={15} /> Open list
					</button>
				</div>
				{open && (
					<Modal
						title={`${listName} List`}
						description={`${rowCount} record${rowCount === 1 ? '' : 's'} available.`}
						onClose={() => setOpen(false)}
					>
						<DataTableContent {...props} />
					</Modal>
				)}
			</div>
		)
	}
	return <DataTableContent {...props} />
}

function DataTableContent({
	rows,
	columns,
	empty = 'No records found',
	bulkDelete,
}: {
	rows: any[]
	columns: DataColumn[]
	empty?: string
	bulkDelete?: {
		label?: string
		onDeleteSelected: (rows: any[]) => Promise<void>
	}
}) {
	const [pageSize, setPageSize] = useState(8)
	const [page, setPage] = useState(1)
	const [query, setQuery] = useState('')
	const [sortKey, setSortKey] = useState(columns[0]?.key ?? '')
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
	const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
	const [deletingSelected, setDeletingSelected] = useState(false)
	const [visibleColumns, setVisibleColumns] = useState(
		() => new Set(columns.map((column) => column.key))
	)
	const activeColumns = columns.filter((column) =>
		visibleColumns.has(column.key)
	)
	const selectable = Boolean(bulkDelete)
	const rowKeyMap = useMemo(
		() =>
			new Map(
				rows.map((row, index) => [row, String(row.id ?? `row-${index}`)])
			),
		[rows]
	)
	const rowKey = (row: any) =>
		rowKeyMap.get(row) ?? String(row.id ?? JSON.stringify(row))
	const filteredRows = useMemo(() => {
		const normalized = query.trim().toLowerCase()
		const searched = !normalized
			? rows
			: rows.filter((row) =>
					JSON.stringify(row).toLowerCase().includes(normalized)
				)
		const sorted = [...searched].sort((a, b) => {
			const left = String(a?.[sortKey] ?? '').toLowerCase()
			const right = String(b?.[sortKey] ?? '').toLowerCase()
			return sortDir === 'asc'
				? left.localeCompare(right)
				: right.localeCompare(left)
		})
		return sorted
	}, [query, rows, sortDir, sortKey])
	const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
	const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)
	useEffect(() => {
		setPage(1)
		setSelectedRows(new Set())
	}, [rows.length, query, pageSize])

	function toggleSort(key: string) {
		if (sortKey === key)
			setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
		else {
			setSortKey(key)
			setSortDir('asc')
		}
	}

	async function exportRows() {
		const header = activeColumns.map((column) => column.label).join(',')
		const body = filteredRows
			.map((row) =>
				activeColumns
					.map((column) => JSON.stringify(String(row[column.key] ?? '')))
					.join(',')
			)
			.join('\n')
		await saveTextFile(
			'fmoh-table-export.csv',
			[header, body].filter(Boolean).join('\n'),
			[{ name: 'CSV', extensions: ['csv'] }]
		)
	}

	function clearSelection() {
		setSelectedRows(new Set())
		notify('success', 'Selection cleared.')
	}

	async function deleteSelectedRows() {
		if (!bulkDelete) return
		const selected = rows.filter((row) => selectedRows.has(rowKey(row)))
		if (!selected.length) {
			notify('warning', 'No records selected.')
			clearSelection()
			return
		}
		setDeletingSelected(true)
		try {
			await bulkDelete.onDeleteSelected(selected)
			setSelectedRows(new Set())
		} catch {
			// The caller displays the specific backend error and keeps the selection visible for retry.
		} finally {
			setDeletingSelected(false)
		}
	}

	return (
		<div className='overflow-hidden rounded-lg border border-border bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--surface-subtle)))] shadow-sm'>
			<div className='no-print flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/35 p-3'>
				<label className='relative min-w-[220px] flex-1'>
					<Search className='absolute left-3 top-2.5 text-primary' size={16} />
					<input
						className='w-full rounded-lg border border-border bg-background/80 py-2 pl-9 pr-3 text-sm'
						placeholder='Search table...'
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</label>
				<div className='flex flex-wrap items-center gap-2'>
					<label className='inline-flex items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2 text-xs font-semibold text-muted-foreground'>
						<SlidersHorizontal size={14} />
						Rows
						<select
							className='h-7 min-h-0 rounded-md border border-border bg-background px-1 py-0 text-xs'
							value={pageSize}
							onChange={(event) => setPageSize(Number(event.target.value))}
						>
							{[5, 8, 12, 20].map((size) => (
								<option key={size} value={size}>
									{size}
								</option>
							))}
						</select>
					</label>
					<details className='relative'>
						<summary className='inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2 text-xs font-semibold text-muted-foreground marker:hidden'>
							<Columns3 size={14} /> Columns
						</summary>
						<div className='absolute right-0 z-20 mt-2 grid w-56 gap-1 rounded-lg border border-border bg-[hsl(var(--surface))] p-2 shadow-xl'>
							{columns.map((column) => (
								<label
									key={column.key}
									className='flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-background/60'
								>
									<input
										type='checkbox'
										checked={visibleColumns.has(column.key)}
										onChange={(event) => {
											const next = new Set(visibleColumns)
											if (event.target.checked) next.add(column.key)
											else if (next.size > 1) next.delete(column.key)
											setVisibleColumns(next)
										}}
									/>
									{column.label}
								</label>
							))}
						</div>
					</details>
					<button
						type='button'
						className='inline-flex items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2 text-xs font-semibold text-muted-foreground'
						onClick={exportRows}
					>
						<Download size={14} /> Export
					</button>
				</div>
			</div>
			{selectable && selectedRows.size > 0 && (
				<div className='flex items-center justify-between gap-3 border-b border-border bg-primary/10 px-3 py-2 text-sm'>
					<span className='font-semibold text-primary'>
						{selectedRows.size} selected
					</span>
					<div className='flex flex-wrap items-center gap-2'>
						<button
							type='button'
							className='rounded-md border border-border bg-background/70 px-3 py-1 text-xs'
							title='Clear current table selection'
							onClick={clearSelection}
						>
							Clear selection
						</button>
						{bulkDelete && (
							<button
								type='button'
								className='rounded-md border border-danger/40 bg-danger/10 px-3 py-1 text-xs font-semibold text-danger disabled:opacity-60'
								disabled={deletingSelected}
								onClick={deleteSelectedRows}
							>
								<LoadingInline
									loading={deletingSelected}
									label={bulkDelete.label ?? 'Delete selected'}
									loadingLabel='Deleting...'
								/>
							</button>
						)}
					</div>
				</div>
			)}
			<div className='w-full overflow-x-hidden overflow-y-auto'>
				<table className='data-table w-full border-collapse text-[12px] sm:text-sm'>
					<thead className='bg-primary/10 text-left text-[11px] uppercase text-primary'>
						<tr>
							{selectable && (
								<th className='w-10 px-2 py-2'>
									<input
										aria-label='Select visible rows'
										type='checkbox'
										checked={
											visibleRows.length > 0 &&
											visibleRows.every((row) => selectedRows.has(rowKey(row)))
										}
										onChange={(event) => {
											const next = new Set(selectedRows)
											visibleRows.forEach((row) => {
												const id = rowKey(row)
												if (event.target.checked) next.add(id)
												else next.delete(id)
											})
											setSelectedRows(next)
										}}
									/>
								</th>
							)}
							{activeColumns.map((column) => (
								<th
									key={column.key}
									className='px-2 py-2 font-semibold leading-tight'
								>
									<button
										className='inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left text-[11px] font-semibold uppercase text-primary hover:bg-primary/10'
										onClick={() => toggleSort(column.key)}
									>
										{column.label}
										{sortKey === column.key && (
											<span aria-hidden='true'>
												{sortDir === 'asc' ? 'ASC' : 'DESC'}
											</span>
										)}
									</button>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{filteredRows.length === 0 ? (
							<tr>
								<td
									className='px-4 py-8 text-center text-muted-foreground'
									colSpan={activeColumns.length + (selectable ? 1 : 0)}
								>
									<div className='mx-auto max-w-sm rounded-lg border border-dashed border-border bg-background/45 p-5'>
										{empty}
									</div>
								</td>
							</tr>
						) : (
							visibleRows.map((row, index) => (
								<tr
									className='border-t border-border/80 hover:bg-background/40'
									key={row.id ?? `${page}-${index}`}
								>
									{selectable && (
										<td className='px-2 py-2 align-middle'>
											<input
												aria-label='Select row'
												type='checkbox'
												checked={selectedRows.has(rowKey(row))}
												onChange={(event) => {
													const id = rowKey(row)
													const next = new Set(selectedRows)
													if (event.target.checked) next.add(id)
													else next.delete(id)
													setSelectedRows(next)
												}}
											/>
										</td>
									)}
									{activeColumns.map((column) => {
										const content = column.render
											? column.render(row)
											: row[column.key]
										const isAction =
											column.key === 'action' || column.key === 'actions'
										const isStatus = [
											'status',
											'receiptStatus',
											'inspection',
											'storage',
											'stockStatus',
											'active',
										].includes(column.key)
										const isPlain =
											typeof content === 'string' ||
											typeof content === 'number' ||
											content === null ||
											content === undefined
										return (
											<td
												key={column.key}
												className={cn(
													'px-2 py-2 align-middle',
													isAction && 'min-w-[7.5rem]',
													isStatus && 'min-w-[6.5rem]'
												)}
											>
												<div
													className={
														isAction
															? 'table-action-cell'
															: isPlain
																? 'table-cell-content'
																: 'table-rich-content'
													}
													title={plainText(content)}
												>
													{content}
												</div>
											</td>
										)
									})}
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
			{filteredRows.length > pageSize && (
				<div className='flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/35 px-3 py-2 text-sm text-muted-foreground'>
					<span>
						Showing {(page - 1) * pageSize + 1}-
						{Math.min(page * pageSize, filteredRows.length)} of{' '}
						{filteredRows.length}
					</span>
					<div className='flex items-center gap-2'>
						<button
							className='rounded-md border border-border bg-background/70 px-3 py-1 disabled:opacity-50'
							disabled={page <= 1}
							onClick={() => setPage((current) => Math.max(1, current - 1))}
						>
							Previous
						</button>
						<span className='rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs font-semibold'>
							Page {page} of {totalPages}
						</span>
						<button
							className='rounded-md border border-border bg-background/70 px-3 py-1 disabled:opacity-50'
							disabled={page >= totalPages}
							onClick={() =>
								setPage((current) => Math.min(totalPages, current + 1))
							}
						>
							Next
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

const chartColors = [
	'#14b8a6',
	'#3b82f6',
	'#f59e0b',
	'#ef4444',
	'#8b5cf6',
	'#06b6d4',
	'#84cc16',
]

function formatNumber(value: number | string | null | undefined, decimals = 0) {
	return Number(value ?? 0).toLocaleString(undefined, {
		maximumFractionDigits: decimals,
		minimumFractionDigits: decimals,
	})
}

function formatDate(value: string | null | undefined) {
	if (!value) return 'N/A'
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString()
}

function numericValue(value: unknown) {
	return value === '' || value === null || value === undefined
		? Number.NaN
		: Number(value)
}

function PieChartCard({
	title,
	rows,
	icon: Icon = BarChart3,
}: {
	title: string
	rows: { name: string; value: number }[]
	icon?: React.ComponentType<{ size?: number; className?: string }>
}) {
	const total = rows.reduce((sum, row) => sum + Number(row.value ?? 0), 0)
	let offset = 0
	const circumference = 2 * Math.PI * 36
	const segments =
		total > 0
			? rows.map((row, index) => {
					const value = Number(row.value ?? 0)
					const dash = (value / total) * circumference
					const segment = {
						...row,
						dash,
						offset,
						color: chartColors[index % chartColors.length],
					}
					offset -= dash
					return segment
				})
			: []
	return (
		<section className='rounded-lg border border-border bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--surface-subtle)))] p-4 shadow-sm'>
			<div className='mb-4 flex items-center justify-between gap-3'>
				<div className='flex min-w-0 items-center gap-3'>
					<span className='grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary'>
						<Icon size={18} />
					</span>
					<h3 className='truncate text-sm font-semibold'>{title}</h3>
				</div>
				<span className='rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground'>
					{rows.length} groups
				</span>
			</div>
			{total <= 0 ? (
				<div className='rounded-lg border border-dashed border-border bg-background/50 p-6 text-sm text-muted-foreground'>
					No data for this chart.
				</div>
			) : (
				<div className='grid items-center gap-4 sm:grid-cols-[150px_1fr]'>
					<div className='relative mx-auto h-36 w-36'>
						<svg
							viewBox='0 0 100 100'
							className='h-36 w-36 -rotate-90 drop-shadow-sm'
							role='img'
							aria-label={title}
						>
							<circle
								cx='50'
								cy='50'
								r='36'
								fill='none'
								stroke='hsl(var(--surface-subtle))'
								strokeWidth='17'
							/>
							{segments.map((segment) => (
								<circle
									key={segment.name}
									cx='50'
									cy='50'
									r='36'
									fill='none'
									stroke={segment.color}
									strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
									strokeDashoffset={segment.offset}
									strokeLinecap='round'
									strokeWidth='17'
								>
									<title>
										{segment.name}: {segment.value}
									</title>
								</circle>
							))}
						</svg>
						<div className='absolute inset-0 grid place-items-center text-center'>
							<div className='grid h-20 w-20 place-items-center rounded-full border border-border bg-background/80 shadow-sm'>
								<div>
									<p className='text-[10px] uppercase text-muted-foreground'>
										Total
									</p>
									<p className='text-base font-semibold'>
										{formatNumber(total, total % 1 ? 2 : 0)}
									</p>
								</div>
							</div>
						</div>
					</div>
					<div className='grid min-w-0 gap-2 text-sm'>
						{segments.map((segment) => (
							<div
								key={segment.name}
								className='grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-transparent px-2 py-2 hover:border-border hover:bg-background/50'
							>
								<span className='flex min-w-0 items-center gap-2'>
									<span
										className='h-2.5 w-2.5 shrink-0 rounded-full shadow-sm'
										style={{ background: segment.color }}
									/>
									<span className='truncate'>{segment.name}</span>
								</span>
								<span className='font-semibold'>
									{formatNumber(
										Number(segment.value),
										Number(segment.value) % 1 ? 2 : 0
									)}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</section>
	)
}

function LineChartCard({
	title,
	rows,
	icon: Icon = TrendingUp,
	xKey = 'date',
}: {
	title: string
	rows: {
		date?: string
		month?: string
		name?: string
		quantity?: number
		value?: number
	}[]
	icon?: React.ComponentType<{ size?: number; className?: string }>
	xKey?: 'date' | 'month' | 'name'
}) {
	const max = Math.max(
		...rows.map((row) => Number(row.quantity ?? row.value ?? 0)),
		0
	)
	const points = rows.map((row, index) => {
		const value = Number(row.quantity ?? row.value ?? 0)
		const x = rows.length <= 1 ? 50 : (index / (rows.length - 1)) * 100
		const y = max <= 0 ? 100 : 100 - (value / max) * 88
		return {
			x,
			y,
			value,
			label: row[xKey] ?? row.date ?? row.month ?? row.name ?? '',
		}
	})
	const path = points
		.map(
			(point, index) =>
				`${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
		)
		.join(' ')
	return (
		<section className='rounded-lg border border-border bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--surface-subtle)))] p-4 shadow-sm'>
			<div className='mb-4 flex items-center justify-between gap-3'>
				<div className='flex min-w-0 items-center gap-3'>
					<span className='grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-500/15 text-sky-300'>
						<Icon size={18} />
					</span>
					<h3 className='truncate text-sm font-semibold'>{title}</h3>
				</div>
				<span className='rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground'>
					Trend
				</span>
			</div>
			{rows.length === 0 || max === 0 ? (
				<div className='rounded-lg border border-dashed border-border bg-background/50 p-6 text-sm text-muted-foreground'>
					No consumption data for this period.
				</div>
			) : (
				<div className='space-y-3'>
					<svg
						className='h-48 w-full overflow-visible'
						viewBox='0 0 100 110'
						preserveAspectRatio='none'
						role='img'
						aria-label={title}
					>
						<line
							x1='0'
							y1='100'
							x2='100'
							y2='100'
							stroke='currentColor'
							strokeOpacity='0.18'
							strokeWidth='1'
						/>
						<path
							d={path}
							fill='none'
							stroke='url(#line-gradient)'
							strokeWidth='3'
							strokeLinecap='round'
							strokeLinejoin='round'
							vectorEffect='non-scaling-stroke'
						/>
						<defs>
							<linearGradient id='line-gradient' x1='0' x2='1' y1='0' y2='0'>
								<stop offset='0%' stopColor='#38bdf8' />
								<stop offset='55%' stopColor='#14b8a6' />
								<stop offset='100%' stopColor='#84cc16' />
							</linearGradient>
						</defs>
						{points.map((point) => (
							<circle
								key={`${point.label}-${point.x}`}
								cx={point.x}
								cy={point.y}
								r='1.8'
								fill='#14b8a6'
								vectorEffect='non-scaling-stroke'
							/>
						))}
					</svg>
					<div className='grid gap-2 text-xs text-muted-foreground sm:grid-cols-3'>
						{points.slice(-3).map((point) => (
							<div
								key={point.label}
								className='rounded-md border border-border bg-background/45 px-2 py-1'
							>
								<span className='block truncate'>{point.label}</span>
								<span className='font-semibold text-foreground'>
									{formatNumber(point.value)}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</section>
	)
}

function kpiPercent(value: number | null | undefined) {
	if (value === null || value === undefined) return 'N/A'
	return `${(Math.min(1, Math.max(0, Number(value))) * 100).toFixed(1)}%`
}

function kpiRatio(value: number | null | undefined) {
	if (value === null || value === undefined || Number.isNaN(Number(value)))
		return null
	return Math.min(1, Math.max(0, Number(value)))
}

function accuracyTone(
	value: number | null | undefined
): 'success' | 'warning' | 'danger' | 'default' {
	const ratio = kpiRatio(value)
	if (ratio === null) return 'default'
	if (ratio >= 0.95) return 'success'
	if (ratio >= 0.8) return 'warning'
	return 'danger'
}

function accuracyDescription(value: number | null | undefined) {
	const ratio = kpiRatio(value)
	if (ratio === null) return 'No submitted counts yet'
	if (ratio >= 0.95) return 'Good: count variance is within target'
	if (ratio >= 0.8) return 'Needs attention: count variance is rising'
	return 'Poor: count variance requires action'
}

function sectionIcon(title: string) {
	const value = title.toLowerCase()
	if (value.includes('user') || value.includes('department')) return Users
	if (value.includes('report') || value.includes('export')) return FileDown
	if (value.includes('receiv') || value.includes('grn')) return PackagePlus
	if (value.includes('storage') || value.includes('location')) return MapPin
	if (value.includes('issue') || value.includes('request')) return PackageCheck
	if (value.includes('count') || value.includes('inspection'))
		return ClipboardCheck
	if (value.includes('disposal')) return Recycle
	if (value.includes('ledger') || value.includes('audit')) return History
	if (value.includes('configuration') || value.includes('master'))
		return Database
	if (value.includes('item') || value.includes('stock')) return Boxes
	return Activity
}

function Modal({
	title,
	description,
	onClose,
	children,
}: {
	title: string
	description?: string
	onClose: () => void
	children: React.ReactNode
}) {
	const depth = React.useContext(ModalDepthContext)
	useEffect(() => {
		const previousOverflow = document.body.style.overflow
		const previousOverscroll = document.body.style.overscrollBehavior
		document.body.style.overflow = 'hidden'
		document.body.style.overscrollBehavior = 'none'
		return () => {
			document.body.style.overflow = previousOverflow
			document.body.style.overscrollBehavior = previousOverscroll
		}
	}, [])

	return (
		<ModalDepthContext.Provider value={depth + 1}>
			<div
				className='fixed inset-0 z-50 grid h-[100dvh] w-screen place-items-center overflow-hidden bg-black/80 p-4 backdrop-blur-sm overscroll-none'
				onWheel={(event) => event.stopPropagation()}
				onTouchMove={(event) => event.stopPropagation()}
			>
				<section
					className='flex max-h-[88vh] min-w-0 w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-primary/35 bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--surface-subtle)))] shadow-2xl ring-1 ring-white/10'
					role='dialog'
					aria-modal='true'
					aria-label={title}
				>
					<div className='flex items-start justify-between gap-4 border-b border-border bg-primary/10 px-5 py-4'>
						<div className='flex min-w-0 items-start gap-3'>
							<span className='grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-background/70 text-primary'>
								{React.createElement(sectionIcon(title), { size: 20 })}
							</span>
							<div>
								<h2 className='text-lg font-semibold tracking-tight'>
									{title}
								</h2>
								{description && (
									<p className='mt-1 text-sm text-muted-foreground'>
										{description}
									</p>
								)}
							</div>
						</div>
						<button
							className='rounded-md border border-border bg-background p-2 hover:bg-[hsl(var(--surface-subtle))]'
							aria-label='Close modal'
							onClick={onClose}
						>
							<X size={18} />
						</button>
					</div>
					<div className='min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain p-5'>
						{children}
					</div>
				</section>
			</div>
		</ModalDepthContext.Provider>
	)
}

function Dashboard({ token, user }: { token: string; user: User }) {
	const [data, setData] = useState<any>()
	const [error, setError] = useState('')
	const [detailModal, setDetailModal] = useState<'queues' | 'movement' | null>(
		null
	)
	useEffect(() => {
		request<any>('/dashboard', token)
			.then(setData)
			.catch((err) => setError(errorMessage(err, 'Unable to load dashboard.')))
	}, [token])
	if (error) return <ErrorState message={error} />
	if (!data) return <LoadingState />
	const queueCount = data.dueForReorder?.length ?? 0
	const movementCount =
		(data.fastMoving?.length ?? 0) +
		(data.slowMoving?.length ?? 0) +
		(data.monthlyConsumption?.length ?? 0)
	const inventoryAccuracy = kpiRatio(data.kpis?.inventoryAccuracy)
	const inventoryAccuracyTone = accuracyTone(inventoryAccuracy)
	const dashboardCopy: Record<
		RoleName,
		{ eyebrow: string; title: string; description: string }
	> = {
		SYSTEM_ADMINISTRATOR: {
			eyebrow: 'Administration command',
			title: 'Administration Dashboard',
			description:
				'User access, approvals, reports, configuration health, and audit visibility for the whole inventory system.',
		},
		STOREKEEPER: {
			eyebrow: 'Store operations',
			title: 'Storekeeper Dashboard',
			description:
				'Receiving, storage, issuing, counts, disposals, and stock movement queues for daily warehouse work.',
		},
		DEPARTMENT_USER: {
			eyebrow: 'Department workspace',
			title: 'Department Request Dashboard',
			description:
				'Your stock requests, receipts, and request status without storekeeper or administrator controls.',
		},
		APPROVER: {
			eyebrow: 'Approval desk',
			title: 'Approver Dashboard',
			description:
				'Pending issue, reconciliation, and disposal decisions with read-only stock context.',
		},
		INSPECTOR: {
			eyebrow: 'Quality inspection',
			title: 'Inspector Dashboard',
			description:
				'Physical inspection and quality verification queue for returned items and supplier goods receipts.',
		},
		VIEWER_AUDITOR: {
			eyebrow: 'Read-only review',
			title: 'Auditor Dashboard',
			description:
				'Inventory status, ledger history, reports, and audit trails with no write actions.',
		},
	}
	const copy = dashboardCopy[user.role]
	return (
		<section className='space-y-8'>
			<div className='relative overflow-hidden rounded-lg border border-border bg-[linear-gradient(135deg,rgba(20,184,166,.18),hsl(var(--surface))_45%,rgba(59,130,246,.14))] p-5 shadow-sm'>
				<svg
					className='pointer-events-none absolute right-0 top-0 h-full w-64 opacity-25'
					viewBox='0 0 220 140'
					preserveAspectRatio='none'
					aria-hidden='true'
				>
					<path
						d='M12 116 C48 18 86 112 120 48 S174 10 210 58'
						fill='none'
						stroke='currentColor'
						strokeWidth='10'
						strokeLinecap='round'
					/>
					<path
						d='M24 122 C60 70 88 128 126 82 S178 46 214 88'
						fill='none'
						stroke='currentColor'
						strokeWidth='4'
						strokeLinecap='round'
					/>
				</svg>
				<div className='relative flex flex-wrap items-end justify-between gap-4'>
					<div className='max-w-2xl'>
						<div className='mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary'>
							<Activity size={14} /> {copy.eyebrow}
						</div>
						<h1 className='text-3xl font-semibold tracking-tight'>
							{copy.title}
						</h1>
						<p className='mt-2 text-sm text-muted-foreground'>
							{copy.description}
						</p>
					</div>
					<div className='flex flex-wrap gap-2'>
						<div className='inline-flex items-center gap-2 rounded-lg border border-border bg-background/75 px-3 py-2 text-sm text-muted-foreground shadow-sm'>
							<Gauge size={16} className='text-primary' />
							KPI period{' '}
							<span className='font-semibold text-foreground'>
								{data.kpis?.period ?? 'N/A'}
							</span>
						</div>
						<div
							className={cn(
								'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground shadow-sm',
								inventoryAccuracyTone === 'success'
									? 'border-emerald-500/25 bg-emerald-500/10'
									: inventoryAccuracyTone === 'warning'
										? 'border-amber-500/30 bg-amber-500/10'
										: inventoryAccuracyTone === 'danger'
											? 'border-rose-500/30 bg-rose-500/10'
											: 'border-border bg-background/75'
							)}
						>
							<ShieldCheck
								size={16}
								className={
									inventoryAccuracyTone === 'danger'
										? 'text-rose-300'
										: inventoryAccuracyTone === 'warning'
											? 'text-amber-300'
											: 'text-emerald-300'
								}
							/>
							Accuracy{' '}
							<span className='font-semibold text-foreground'>
								{kpiPercent(inventoryAccuracy)}
							</span>
						</div>
					</div>
				</div>
			</div>

			<div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
				<Stat
					label='Inventory value'
					value={formatNumber(data.totalInventoryValue, 2)}
					description='Total value on hand'
					tone='success'
					icon={CircleDollarSign}
				/>
				<Stat
					label='Available stock'
					value={formatNumber(data.availableStock)}
					description={`${formatNumber(data.currentStock)} current units`}
					tone='info'
					icon={Warehouse}
				/>
				<Stat
					label='Low stock'
					value={data.lowStock?.length ?? 0}
					description='Items at or below reorder level'
					tone={(data.lowStock?.length ?? 0) > 0 ? 'warning' : 'success'}
					icon={AlertTriangle}
				/>
				<Stat
					label='Stock-outs'
					value={data.stockOuts?.length ?? 0}
					description='Items with no available balance'
					tone={(data.stockOuts?.length ?? 0) > 0 ? 'danger' : 'success'}
					icon={PackageSearch}
				/>
			</div>

			<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6'>
				<Stat label='Active items' value={data.totalItems} icon={Boxes} />
				<Stat
					label='Pending inspection'
					value={data.pendingInspectionCount ?? 0}
					tone={(data.pendingInspectionCount ?? 0) > 0 ? 'warning' : 'default'}
					icon={ClipboardCheck}
				/>
				<Stat
					label='Pending storage'
					value={data.pendingStorageAllocation ?? 0}
					tone={
						(data.pendingStorageAllocation ?? 0) > 0 ? 'warning' : 'default'
					}
					icon={MapPin}
				/>
				<Stat
					label='Pending approval'
					value={data.pendingApprovalCount ?? 0}
					icon={TimerReset}
				/>
				<Stat
					label='Monthly consumption'
					value={formatNumber((data.monthlyConsumption ?? []).at(-1)?.quantity)}
					icon={TrendingUp}
				/>
			</div>

			<Panel
				title='KPI health'
				description='Calculated from stock movements, physical counts, requests, and disposal records.'
			>
				<div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
					<Stat
						label='Inventory accuracy'
						value={kpiPercent(inventoryAccuracy)}
						description={accuracyDescription(inventoryAccuracy)}
						tone={inventoryAccuracyTone}
						icon={ShieldCheck}
					/>
					<Stat
						label='Stock-out rate'
						value={kpiPercent(data.kpis?.stockOutRate)}
						tone={
							Number(data.kpis?.stockOutRate ?? 0) > 0 ? 'warning' : 'success'
						}
						icon={AlertTriangle}
					/>
					<Stat
						label='Order fulfillment'
						value={kpiPercent(data.kpis?.orderFulfillmentRate)}
						tone='success'
						icon={PackageCheck}
					/>
					<Stat
						label='Dead stock percentage'
						value={kpiPercent(data.kpis?.deadStockPercentage)}
						icon={PackageSearch}
					/>
					<Stat
						label='Disposal rate'
						value={kpiPercent(data.kpis?.disposalRate)}
						icon={Recycle}
					/>
					<Stat
						label='Turnover ratio'
						value={Number(data.inventoryTurnoverRatio ?? 0).toFixed(2)}
						icon={ArrowUpRight}
					/>
				</div>
			</Panel>

			<div className='grid gap-5 md:grid-cols-2 2xl:grid-cols-3'>
				<PieChartCard
					title='Stock Status Distribution'
					rows={data.charts?.stockStatusDistribution ?? []}
					icon={Gauge}
				/>
				<PieChartCard
					title='Inventory Value by Category'
					rows={data.charts?.inventoryValueByCategory ?? []}
					icon={Layers3}
				/>
				<PieChartCard
					title='Inventory Value by Funding Source'
					rows={data.charts?.inventoryValueByFundingSource ?? []}
					icon={CircleDollarSign}
				/>
				<PieChartCard
					title='Consumption by Department'
					rows={data.charts?.consumptionByDepartment ?? []}
					icon={Users}
				/>
				<PieChartCard
					title='Disposal Reason Distribution'
					rows={data.charts?.disposalReasonDistribution ?? []}
					icon={Recycle}
				/>
				<LineChartCard
					title='Daily Consumption Trend'
					rows={data.charts?.dailyConsumptionTrend ?? []}
					icon={TrendingUp}
					xKey='date'
				/>
				<LineChartCard
					title='Monthly Consumption Trend'
					rows={data.charts?.monthlyConsumptionTrend ?? []}
					icon={TrendingUp}
					xKey='month'
				/>
			</div>

			<Panel
				title='Drill-down details'
				description='Detailed backend tables are kept in modal windows so the dashboard remains focused.'
			>
				<div className='grid gap-4 md:grid-cols-2'>
					<button
						className='group rounded-lg border border-amber-500/25 bg-[linear-gradient(135deg,rgba(245,158,11,.14),hsl(var(--surface))_58%)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400/45 hover:shadow-md'
						onClick={() => setDetailModal('queues')}
					>
						<span className='flex items-center justify-between gap-3'>
							<span className='grid h-10 w-10 place-items-center rounded-lg bg-amber-500/15 text-amber-300'>
								<TimerReset size={20} />
							</span>
							<ArrowUpRight
								className='text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground'
								size={18}
							/>
						</span>
						<p className='mt-4 text-sm font-semibold'>Operational queues</p>
						<p className='mt-2 text-3xl font-semibold'>{queueCount}</p>
						<p className='mt-1 text-sm text-muted-foreground'>
							Reorder items and other stock queues.
						</p>
					</button>
					<button
						className='group rounded-lg border border-sky-500/25 bg-[linear-gradient(135deg,rgba(14,165,233,.14),hsl(var(--surface))_58%)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-400/45 hover:shadow-md'
						onClick={() => setDetailModal('movement')}
					>
						<span className='flex items-center justify-between gap-3'>
							<span className='grid h-10 w-10 place-items-center rounded-lg bg-sky-500/15 text-sky-300'>
								<TrendingUp size={20} />
							</span>
							<ArrowUpRight
								className='text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground'
								size={18}
							/>
						</span>
						<p className='mt-4 text-sm font-semibold'>Movement intelligence</p>
						<p className='mt-2 text-3xl font-semibold'>{movementCount}</p>
						<p className='mt-1 text-sm text-muted-foreground'>
							Fast movers, slow movers, monthly consumption, and quality
							measures.
						</p>
					</button>
				</div>
			</Panel>

			{detailModal === 'queues' && (
				<Modal
					title='Operational queues'
					description='Work that needs storekeeper or approver attention.'
					onClose={() => setDetailModal(null)}
				>
					<div className='grid gap-5'>
						<Panel title='Due for reorder'>
							<DataTable
								rows={data.dueForReorder}
								columns={[
									{
										key: 'item',
										label: 'Item',
										render: (row) => row.item.description,
									},
									{ key: 'quantity', label: 'Qty' },
								]}
							/>
						</Panel>
					</div>
				</Modal>
			)}

			{detailModal === 'movement' && (
				<Modal
					title='Movement intelligence'
					description='Consumption and movement patterns calculated from posted issue transactions.'
					onClose={() => setDetailModal(null)}
				>
					<div className='grid gap-5 xl:grid-cols-2'>
						<Panel title='Fast moving'>
							<DataTable
								rows={data.fastMoving}
								columns={[
									{
										key: 'item',
										label: 'Item',
										render: (row) => row.item.description,
									},
									{ key: 'issuedQuantity', label: 'Issued' },
									{ key: 'quantity', label: 'On hand' },
								]}
							/>
						</Panel>
						<Panel title='Slow moving'>
							<DataTable
								rows={data.slowMoving}
								columns={[
									{
										key: 'item',
										label: 'Item',
										render: (row) => row.item.description,
									},
									{ key: 'issuedQuantity', label: 'Issued' },
									{ key: 'quantity', label: 'On hand' },
								]}
							/>
						</Panel>
						<Panel title='Monthly consumption'>
							<DataTable
								rows={data.monthlyConsumption}
								columns={[
									{ key: 'month', label: 'Month' },
									{ key: 'quantity', label: 'Issued' },
								]}
							/>
						</Panel>
						<Panel title='Inventory quality'>
							<DataTable
								rows={[
									{ name: 'Dead stock', value: data.deadStock?.length ?? 0 },
									{
										name: 'Pending disposal',
										value: data.pendingDisposalCount ?? 0,
									},
									{
										name: 'Disposal value',
										value: formatNumber(data.disposalValue, 2),
									},
								]}
								columns={[
									{ key: 'name', label: 'Measure' },
									{ key: 'value', label: 'Value' },
								]}
							/>
						</Panel>
					</div>
				</Modal>
			)}
		</section>
	)
}

function UsersPage({ token }: { token: string }) {
	const [rows, setRows] = useState<any[]>([])
	const [master, setMaster] = useState<any>()
	const [message, setMessage] = useState('')
	const [loadingAction, setLoadingAction] = useState('')
	const [showInactive, setShowInactive] = useState(false)
	const emptyUserForm = {
		id: '',
		email: '',
		fullName: '',
		role: 'DEPARTMENT_USER',
		departmentId: '',
		password: 'Password123!',
		active: true,
	}
	const [form, setForm] = useState<any>(emptyUserForm)
	const load = async () => {
		const [users, masterData] = await Promise.all([
			request<any[]>('/admin/users', token),
			request<any>('/master-data', token),
		])
		setRows(users)
		setMaster(masterData)
		setForm((current: any) => ({
			...current,
			departmentId:
				current.departmentId || masterData.departments?.[0]?.id || '',
		}))
	}
	useEffect(() => {
		load().catch((err) =>
			setMessage(errorMessage(err, 'Unable to load users.'))
		)
	}, [token])
	async function save(event: React.FormEvent) {
		event.preventDefault()
		setLoadingAction('save-user')
		try {
			const payload = {
				...form,
				departmentId: form.departmentId || undefined,
				password: form.password || undefined,
			}
			await request(
				form.id ? `/admin/users/${form.id}` : '/admin/users',
				token,
				{ method: form.id ? 'PATCH' : 'POST', body: JSON.stringify(payload) }
			)
			setForm({
				...emptyUserForm,
				departmentId: master?.departments?.[0]?.id || '',
			})
			const text = form.id
				? 'User profile updated.'
				: 'User created successfully.'
			setMessage(text)
			notify('success', text)
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to save user.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	function edit(row: any) {
		setForm({
			id: row.id,
			email: row.email,
			fullName: row.fullName,
			role: row.role,
			departmentId: row.departmentId ?? row.department?.id ?? '',
			password: '',
			active: row.active !== false,
		})
		setMessage(
			'Editing user. Leave password blank to keep the current password.'
		)
	}
	async function toggle(row: any) {
		const nextActive = row.active === false
		if (
			!nextActive &&
			!window.confirm(
				`Deactivate ${row.fullName || row.email}? They will no longer be able to sign in.`
			)
		)
			return
		setLoadingAction(row.id)
		try {
			await request(`/admin/users/${row.id}/active`, token, {
				method: 'PATCH',
				body: JSON.stringify({ active: nextActive }),
			})
			const text = nextActive ? 'User activated.' : 'User deactivated.'
			setMessage(text)
			notify('success', text)
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to update user status.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	const visibleRows = rows.filter(
		(user) => showInactive || user.active !== false
	)
	return (
		<Panel title='User Management'>
			<form
				onSubmit={save}
				className='mb-4 grid gap-3 rounded border border-border p-3 md:grid-cols-6'
			>
				<input
					className='rounded border border-border bg-background px-3 py-2 text-sm'
					placeholder='Email'
					value={form.email}
					onChange={(e) => setForm({ ...form, email: e.target.value })}
					required
				/>
				<input
					className='rounded border border-border bg-background px-3 py-2 text-sm'
					placeholder='Full name'
					value={form.fullName}
					onChange={(e) => setForm({ ...form, fullName: e.target.value })}
					required
				/>
				<select
					className='rounded border border-border bg-background px-3 py-2 text-sm'
					value={form.role}
					onChange={(e) => setForm({ ...form, role: e.target.value })}
				>
					<option value='SYSTEM_ADMINISTRATOR'>System Administrator</option>
					<option value='STOREKEEPER'>Storekeeper</option>
					<option value='DEPARTMENT_USER'>Department User</option>
					<option value='APPROVER'>Approver</option>
					<option value='VIEWER_AUDITOR'>Viewer/Auditor</option>
				</select>
				<select
					className='rounded border border-border bg-background px-3 py-2 text-sm'
					value={form.departmentId}
					onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
				>
					<option value=''>No department</option>
					{master?.departments?.map((department: any) => (
						<option key={department.id} value={department.id}>
							{department.name}
						</option>
					))}
				</select>
				<input
					className='rounded border border-border bg-background px-3 py-2 text-sm'
					placeholder='Password'
					value={form.password}
					onChange={(e) => setForm({ ...form, password: e.target.value })}
				/>
				<label className='option-field'>
					<input
						type='checkbox'
						checked={form.active}
						onChange={(e) => setForm({ ...form, active: e.target.checked })}
					/>{' '}
					<span>Active</span>
				</label>
				<button
					disabled={loadingAction === 'save-user'}
					className='rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60'
				>
					<LoadingInline
						loading={loadingAction === 'save-user'}
						label={form.id ? 'Save user' : 'Create user'}
						loadingLabel='Saving...'
					/>
				</button>
				{form.id && (
					<button
						type='button'
						className='rounded border border-border px-3 py-2 text-sm'
						onClick={() =>
							setForm({
								...emptyUserForm,
								departmentId: master?.departments?.[0]?.id || '',
							})
						}
					>
						Cancel edit
					</button>
				)}
			</form>
			<label className='mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground'>
				<input
					type='checkbox'
					checked={showInactive}
					onChange={(e) => setShowInactive(e.target.checked)}
				/>{' '}
				Show inactive users
			</label>
			{message && (
				<p className='mb-3 rounded border border-border bg-muted px-3 py-2 text-sm'>
					{message}
				</p>
			)}
			<DataTable
				rows={visibleRows}
				columns={[
					{ key: 'email', label: 'Email' },
					{ key: 'fullName', label: 'Name' },
					{ key: 'role', label: 'Role' },
					{
						key: 'department',
						label: 'Department',
						render: (row) => row.department?.name ?? 'N/A',
					},
					{
						key: 'active',
						label: 'Status',
						render: (row) =>
							row.active === false ? (
								<span className='rounded bg-slate-200 px-2 py-1 text-xs text-slate-800'>
									Inactive
								</span>
							) : (
								<span className='rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-800'>
									Active
								</span>
							),
					},
					{
						key: 'action',
						label: 'Action',
						render: (row) => (
							<div className='flex flex-wrap gap-2'>
								<button
									className='rounded border border-border px-2 py-1 text-xs'
									onClick={() => edit(row)}
								>
									Edit
								</button>
								<button
									disabled={loadingAction === row.id}
									className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
									onClick={() => toggle(row)}
								>
									<LoadingInline
										loading={loadingAction === row.id}
										label={row.active === false ? 'Activate' : 'Deactivate'}
										loadingLabel='Saving...'
									/>
								</button>
							</div>
						),
					},
				]}
			/>
		</Panel>
	)
}

function MasterDataPage({ token }: { token: string }) {
	const modelOptions = [
		['category', 'Categories'],
		['unitOfMeasure', 'Units'],
		['fundingSource', 'Funding Sources'],
		['storeLocation', 'Stores'],
		['department', 'Departments'],
		['supplierDonor', 'Suppliers/Donors'],
		['disposalReason', 'Disposal Reasons'],
	]
	const [model, setModel] = useState('category')
	const [rows, setRows] = useState<any[]>([])
	const [name, setName] = useState('')
	const [message, setMessage] = useState('')
	const [saving, setSaving] = useState(false)
	const supportsActive = model !== 'unitOfMeasure'
	const load = () =>
		request<any[]>(`/admin/master-data/${model}`, token).then((items) =>
			setRows(items.filter((item) => item.active !== false))
		)
	useEffect(() => {
		load().catch((err) =>
			setMessage(errorMessage(err, 'Unable to load configuration records.'))
		)
	}, [model, token])
	async function create(event: React.FormEvent) {
		event.preventDefault()
		setSaving(true)
		try {
			await request(`/admin/master-data/${model}`, token, {
				method: 'POST',
				body: JSON.stringify({ name }),
			})
			setName('')
			setMessage('Master data saved.')
			notify('success', 'Configuration record saved.')
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to save configuration record.')
			setMessage(message)
			notify('error', message)
		} finally {
			setSaving(false)
		}
	}
	async function toggleActive(row: any) {
		const nextActive = row.active === false
		const verb = nextActive ? 'restore' : 'deactivate'
		if (
			!nextActive &&
			!window.confirm(
				`Deactivate "${row.name}" so it is removed from normal configuration lists? Existing history will be kept.`
			)
		)
			return
		setSaving(true)
		try {
			await request(`/admin/master-data/${model}/${row.id}`, token, {
				method: 'PATCH',
				body: JSON.stringify({ active: nextActive }),
			})
			const text = nextActive
				? 'Configuration record restored.'
				: 'Configuration record deactivated.'
			setMessage(text)
			notify('success', text)
			await load()
		} catch (err) {
			const message = errorMessage(
				err,
				`Unable to ${verb} configuration record.`
			)
			setMessage(message)
			notify('error', message)
		} finally {
			setSaving(false)
		}
	}
	async function deleteSelected(selected: any[]) {
		const ids = selected.map((row) => row.id).filter(Boolean)
		if (!ids.length) {
			const text = 'No records selected for deletion.'
			setMessage(text)
			notify('warning', text)
			return
		}
		const names = selected
			.map((row) => row.name ?? row.id)
			.slice(0, 5)
			.join(', ')
		const suffix =
			selected.length > 5 ? `, and ${selected.length - 5} more` : ''
		if (
			!window.confirm(
				`Permanently delete ${selected.length} selected record${selected.length === 1 ? '' : 's'}?\n\n${names}${suffix}\n\nThis cannot be undone.`
			)
		)
			return
		setSaving(true)
		try {
			const result = await request<{ deletedCount: number }>(
				`/admin/master-data/${model}`,
				token,
				{ method: 'DELETE', body: JSON.stringify({ ids }) }
			)
			const text = `${result.deletedCount} record${result.deletedCount === 1 ? '' : 's'} deleted.`
			setMessage(text)
			notify('success', text)
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to delete selected records.')
			setMessage(message)
			notify('error', message)
			throw err
		} finally {
			setSaving(false)
		}
	}
	return (
		<Panel title='Configuration'>
			<div className='mb-4 flex flex-wrap gap-2'>
				{modelOptions.map(([id, label]) => (
					<button
						key={id}
						className={cn(
							'rounded border border-border px-3 py-2 text-sm',
							model === id && 'bg-primary text-primary-foreground'
						)}
						onClick={() => setModel(id)}
					>
						{label}
					</button>
				))}
			</div>
			<form onSubmit={create} className='mb-4 flex gap-3'>
				<input
					className='w-80 rounded border border-border bg-background px-3 py-2 text-sm'
					placeholder='Name'
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
				/>
				<button
					disabled={saving}
					className='rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60'
				>
					<LoadingInline
						loading={saving}
						label='Add'
						loadingLabel='Adding...'
					/>
				</button>
			</form>
			{message && (
				<p className='mb-3 rounded border border-border bg-muted px-3 py-2 text-sm'>
					{message}
				</p>
			)}
			<DataTable
				rows={rows}
				columns={[
					{ key: 'name', label: 'Name' },
					{ key: 'code', label: 'Code' },
					{ key: 'symbol', label: 'Symbol' },
					{
						key: 'active',
						label: 'Active',
						render: (row) => (row.active === undefined ? 'Always' : 'Yes'),
					},
					{
						key: 'action',
						label: 'Action',
						render: (row) =>
							supportsActive ? (
								<button
									className='inline-flex items-center gap-2 rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
									disabled={saving}
									onClick={() => toggleActive(row)}
								>
									<X size={13} /> Deactivate
								</button>
							) : (
								<span className='text-xs text-muted-foreground'>
									In use by items
								</span>
							),
					},
				]}
				bulkDelete={{
					label: 'Delete selected',
					onDeleteSelected: deleteSelected,
				}}
			/>
		</Panel>
	)
}

function AuditLogs({ token }: { token: string }) {
	const [rows, setRows] = useState<any[]>([])
	useEffect(() => {
		request<any[]>('/audit-logs', token).then(setRows)
	}, [token])
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
						render: (row) => row.actor?.email ?? 'System',
					},
					{ key: 'action', label: 'Action' },
					{ key: 'entityType', label: 'Entity' },
				]}
			/>
		</Panel>
	)
}

function BinCardView({ detail }: { detail: any }) {
	return (
		<div className='space-y-4'>
			<div className='grid gap-3 rounded-lg border border-border bg-background/45 p-3 text-sm md:grid-cols-[1.3fr_2fr_0.8fr_0.8fr]'>
				<div>
					<span className='text-muted-foreground'>Item code</span>
					<br />
					<span className='font-semibold'>{detail.code}</span>
				</div>
				<div>
					<span className='text-muted-foreground'>Item description</span>
					<br />
					<span className='font-semibold'>{detail.description}</span>
				</div>
				<div>
					<span className='text-muted-foreground'>Unit</span>
					<br />
					{detail.unit?.symbol ?? 'N/A'}
				</div>
				<div>
					<span className='text-muted-foreground'>Current balance</span>
					<br />
					{detail.currentStock ?? 'N/A'}
				</div>
			</div>
			<div>
				<h3 className='mb-2 text-sm font-semibold'>Transactions</h3>
				<DataTable
					rows={detail.binCard ?? []}
					empty='No bin card transactions recorded for this item.'
					columns={[
						{
							key: 'date',
							label: 'Date',
							render: (row) =>
								row.date ? new Date(row.date).toLocaleString() : 'N/A',
						},
						{ key: 'transactionType', label: 'Transaction' },
						{
							key: 'itemDescription',
							label: 'Item description',
							render: (row) => row.itemDescription ?? detail.description,
						},
						{ key: 'batchNumber', label: 'Batch no.' },
						{
							key: 'expiryDate',
							label: 'Expiry',
							render: (row) =>
								row.expiryDate
									? new Date(row.expiryDate).toLocaleDateString()
									: 'N/A',
						},
						{
							key: 'unitCost',
							label: 'Unit price',
							render: (row) =>
								row.unitCost == null
									? 'N/A'
									: formatNumber(Number(row.unitCost), 2),
						},
						{
							key: 'totalPrice',
							label: 'Total price',
							render: (row) =>
								row.totalPrice == null
									? 'N/A'
									: formatNumber(Number(row.totalPrice), 2),
						},
						{ key: 'receivedQuantity', label: 'Received' },
						{ key: 'issuedQuantity', label: 'Issued' },
						{ key: 'balance', label: 'Balance' },
					]}
				/>
			</div>
		</div>
	)
}

function BinCardRoute({ token }: { token: string }) {
	const [search, setSearch] = useState('')
	const [items, setItems] = useState<any[]>([])
	const [selectedId, setSelectedId] = useState('')
	const [detail, setDetail] = useState<any>()
	const [message, setMessage] = useState('')
	const [loadingAction, setLoadingAction] = useState('')

	const loadItems = async () => {
		const params = new URLSearchParams({
			active: 'true',
			pageSize: '1000',
			sortBy: 'code',
			sortDir: 'asc',
		})
		if (search.trim()) params.set('search', search.trim())
		const result = await request<any>(`/items?${params.toString()}`, token)
		const rows = result.items ?? []
		setItems(rows)
		setSelectedId((current) =>
			current && rows.some((item: any) => item.id === current)
				? current
				: (rows[0]?.id ?? '')
		)
	}

	useEffect(() => {
		loadItems().catch((err) => {
			const text = errorMessage(err, 'Unable to load items for bin card.')
			setMessage(text)
			notify('error', text)
		})
	}, [token, search])

	async function openBinCard(id = selectedId) {
		if (!id) {
			const text = 'Select an item before opening a bin card.'
			setMessage(text)
			notify('warning', text)
			return
		}
		setLoadingAction(`open-${id}`)
		setMessage('')
		try {
			const next = await request<any>(`/items/${id}`, token)
			setDetail(next)
			setSelectedId(id)
			setMessage(`Bin card loaded for ${next.code}.`)
			notify('success', 'Bin card loaded.')
		} catch (err) {
			const text = errorMessage(err, 'Unable to load bin card.')
			setMessage(text)
			notify('error', text)
		} finally {
			setLoadingAction('')
		}
	}

	return (
		<section className='space-y-5'>
			<Panel
				title='Bin Card'
				description="Open a single item's official stock card with receipts, issues, providers, departments, and running balance."
				action={
					<button
						className='inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm disabled:opacity-60'
						disabled={!detail}
						onClick={() => printCurrentView()}
					>
						<Printer size={16} /> Print
					</button>
				}
			>
				<div className='mb-4 grid gap-3 rounded border border-border bg-background/45 p-3 md:grid-cols-[1fr_minmax(260px,360px)_auto]'>
					<SearchBox value={search} onChange={setSearch} />
					<SearchableSelect
						className='py-2'
						value={selectedId}
						onChange={(value) => setSelectedId(value)}
						options={items.map((item) => ({
							value: item.id,
							label: `${item.code} - ${item.description}`,
						}))}
						placeholder='Select item'
					/>
					<button
						className='primary-action-button'
						disabled={loadingAction === `open-${selectedId}`}
						onClick={() => openBinCard()}
					>
						<LoadingInline
							loading={loadingAction === `open-${selectedId}`}
							label='Open bin card'
							loadingLabel='Opening...'
						/>
					</button>
				</div>
				{message && (
					<p className='mb-3 rounded border border-border bg-muted px-3 py-2 text-sm'>
						{message}
					</p>
				)}
				<DataTable
					rows={items}
					empty='No active items found.'
					columns={[
						{ key: 'code', label: 'Code' },
						{ key: 'description', label: 'Description' },
						{
							key: 'category',
							label: 'Category',
							render: (row) => row.category?.name,
						},
						{ key: 'unit', label: 'Unit', render: (row) => row.unit?.symbol },
						{ key: 'currentStock', label: 'Stock' },
						{
							key: 'stockStatus',
							label: 'Stock status',
							render: (row) => row.stockStatus?.replaceAll('_', ' '),
						},
						{
							key: 'action',
							label: 'Action',
							render: (row) => (
								<button
									className='rounded border border-border px-2 py-1 text-xs'
									disabled={loadingAction === `open-${row.id}`}
									onClick={() => openBinCard(row.id)}
								>
									<LoadingInline
										loading={loadingAction === `open-${row.id}`}
										label='Open'
										loadingLabel='Opening...'
									/>
								</button>
							),
						},
					]}
				/>
			</Panel>
			{detail && (
				<Panel
					title={`Bin Card: ${detail.code}`}
					description='Chronological item transaction card from registration through receipts, issues, and current balances.'
				>
					<BinCardView detail={detail} />
				</Panel>
			)}
		</section>
	)
}

function Adjustments({ token }: { token: string }) {
	const [rows, setRows] = useState<any[]>([])
	const [message, setMessage] = useState('')
	const [loadingAction, setLoadingAction] = useState('')
	const [comments, setComments] = useState<Record<string, string>>({})
	const load = () => request<any[]>('/adjustments', token).then(setRows)
	useEffect(() => {
		load().catch((err) =>
			setMessage(errorMessage(err, 'Unable to load adjustments.'))
		)
	}, [token])
	async function decide(id: string, endpoint: string) {
		const comment = comments[id]?.trim()
		if (endpoint === 'reject' && !comment) {
			setMessage('Rejection comment is required.')
			notify('warning', 'Rejection comment is required.')
			return
		}
		if (
			!window.confirm(
				`${endpoint === 'approve' ? 'Approve' : 'Reject'} this reconciliation adjustment?`
			)
		)
			return
		setLoadingAction(`${id}-${endpoint}`)
		try {
			await request(`/adjustments/${id}/${endpoint}`, token, {
				method: 'POST',
				body: JSON.stringify({ comment: comment || endpoint }),
			})
			const message = `Adjustment ${endpoint}d.`
			setMessage(message)
			notify('success', message)
			setComments((current) => ({ ...current, [id]: '' }))
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to update adjustment.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	return (
		<Panel title='Reconciliation Adjustments'>
			{message && (
				<p className='mb-3 rounded border border-border bg-muted px-3 py-2 text-sm'>
					{message}
				</p>
			)}
			<DataTable
				rows={rows}
				columns={[
					{ key: 'adjustmentNumber', label: 'Adjustment' },
					{
						key: 'item',
						label: 'Item',
						render: (row) => row.item?.description,
					},
					{ key: 'quantityDelta', label: 'Delta' },
					{
						key: 'requestedBy',
						label: 'Requested by',
						render: (row) =>
							row.requestedBy?.fullName ?? row.requestedBy?.email ?? 'N/A',
					},
					{
						key: 'approvalComment',
						label: 'Decision note',
						render: (row) => row.approvalComment ?? 'N/A',
					},
					{ key: 'status', label: 'Status' },
					{
						key: 'action',
						label: 'Action',
						render: (row) =>
							row.status === 'PENDING' ? (
								<div className='grid min-w-56 gap-2'>
									<textarea
										className='min-h-16 rounded border border-border bg-background px-2 py-1 text-xs'
										placeholder='Approval/rejection note'
										value={comments[row.id] ?? ''}
										onChange={(event) =>
											setComments((current) => ({
												...current,
												[row.id]: event.target.value,
											}))
										}
									/>
									<div className='flex gap-2'>
										<button
											disabled={loadingAction === `${row.id}-approve`}
											className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
											onClick={() => decide(row.id, 'approve')}
										>
											<LoadingInline
												loading={loadingAction === `${row.id}-approve`}
												label='Approve'
												loadingLabel='Approving...'
											/>
										</button>
										<button
											disabled={loadingAction === `${row.id}-reject`}
											className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
											onClick={() => decide(row.id, 'reject')}
										>
											<LoadingInline
												loading={loadingAction === `${row.id}-reject`}
												label='Reject'
												loadingLabel='Rejecting...'
											/>
										</button>
									</div>
								</div>
							) : (
								row.status
							),
					},
				]}
			/>
		</Panel>
	)
}

function Items({ token, user }: { token: string; user: User }) {
	const [search, setSearch] = useState('')
	const [data, setData] = useState<any>({ items: [] })
	const [master, setMaster] = useState<any>()
	const [message, setMessage] = useState('')
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [saving, setSaving] = useState(false)
	const [importing, setImporting] = useState(false)
	const [loadingAction, setLoadingAction] = useState('')
	const [files, setFiles] = useState<{ photo?: File; document?: File }>({})
	const [page, setPage] = useState(1)
	const [showItemList, setShowItemList] = useState(false)
	const [itemEditorOpen, setItemEditorOpen] = useState(false)
	const [detail, setDetail] = useState<any>()
	const emptyForm = {
		id: '',
		code: '',
		gtin: '',
		description: '',
		kind: 'GENERAL_SUPPLY',
		categoryId: '',
		unitId: '',
		defaultLocationId: '',
		fundingSourceId: '',
		reorderLevel: '',
		minimumStock: '',
		maximumStock: '',
		batchTrackingRequired: false,
		expiryTrackingRequired: false,
		barcodeRequired: true,
		subCategory: 'Stationery',
		serialNumber: '',
		modelNumber: '',
		depreciationRate: '',
		maintenanceCycle: '',
		departmentAssignmentId: '',
		calibrationDueDate: '',
	}
	const [form, setForm] = useState<any>(emptyForm)
	const canWrite = user.permissions.includes(permissions.ITEM_WRITE)
	const canDeactivate = user.permissions.includes(permissions.ITEM_DEACTIVATE)
	const load = () => {
		const params = new URLSearchParams({
			search,
			page: String(page),
			pageSize: '1000',
			sortBy: 'code',
			sortDir: 'asc',
			active: 'true',
		})
		return request<any>(`/items?${params.toString()}`, token).then(setData)
	}
	useEffect(() => {
		load()
	}, [search, token, page])
	useEffect(() => {
		setPage(1)
	}, [search])
	useEffect(() => {
		request<any>('/master-data', token).then((masterData) => {
			setMaster(masterData)
			setForm((current: any) => ({
				...current,
				categoryId: current.categoryId || masterData.categories?.[0]?.id || '',
				unitId: current.unitId || masterData.units?.[0]?.id || '',
				defaultLocationId:
					current.defaultLocationId || masterData.locations?.[0]?.id || '',
				fundingSourceId:
					current.fundingSourceId || masterData.fundingSources?.[0]?.id || '',
			}))
		})
	}, [token])

	const getSubCategories = (kind: string): string[] => {
		switch (kind) {
			case 'CONSUMABLE':
				return ['Reagents', 'Test Kits', 'PPE']
			case 'FIXED_ASSET':
				return ['Heavy Machinery', 'Vehicles', 'Medical Instrumentation']
			case 'DISPENSABLE_ASSET':
				return ['Diagnostic Tools', 'Handheld Monitors', 'Small Hardware']
			case 'GENERAL_SUPPLY':
				return ['Stationery', 'Office Supplies', 'Cleaning Materials']
			default:
				return []
		}
	}

	const handleKindChange = (newKind: string) => {
		const subCategories = getSubCategories(newKind);
		setForm((current: any) => ({
			...current,
			kind: newKind,
			subCategory: subCategories[0] || '',
			batchTrackingRequired: newKind === 'CONSUMABLE',
			expiryTrackingRequired: newKind === 'CONSUMABLE',
			reorderLevel: newKind === 'FIXED_ASSET' ? '0' : (newKind === 'CONSUMABLE' || newKind === 'GENERAL_SUPPLY' ? (current.reorderLevel === '0' || current.reorderLevel === 0 ? '' : current.reorderLevel) : current.reorderLevel),
			minimumStock: newKind === 'FIXED_ASSET' ? '0' : (newKind === 'CONSUMABLE' || newKind === 'GENERAL_SUPPLY' ? (current.minimumStock === '0' || current.minimumStock === 0 ? '' : current.minimumStock) : current.minimumStock),
			maximumStock: newKind === 'FIXED_ASSET' ? '0' : (newKind === 'CONSUMABLE' || newKind === 'GENERAL_SUPPLY' ? (current.maximumStock === '0' || current.maximumStock === 0 ? '' : current.maximumStock) : current.maximumStock),
			serialNumber: (newKind === 'FIXED_ASSET' || newKind === 'DISPENSABLE_ASSET') ? current.serialNumber : '',
			modelNumber: newKind === 'FIXED_ASSET' ? current.modelNumber : '',
			depreciationRate: newKind === 'FIXED_ASSET' ? current.depreciationRate : '',
			maintenanceCycle: newKind === 'FIXED_ASSET' ? current.maintenanceCycle : '',
			departmentAssignmentId: newKind === 'DISPENSABLE_ASSET' ? current.departmentAssignmentId : '',
			calibrationDueDate: newKind === 'DISPENSABLE_ASSET' ? current.calibrationDueDate : '',
		}));
		setErrors({});
	};

	async function createItem(event: React.FormEvent, closeEditor = false) {
		event.preventDefault()
		const nextErrors: Record<string, string> = {}
		if (!form.code.trim()) nextErrors.code = 'Item code is required.'
		if (form.gtin && !/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(form.gtin))
			nextErrors.gtin = 'GTIN must be 8, 12, 13, or 14 digits.'
		if (!form.description.trim())
			nextErrors.description = 'Description is required.'
		if (!form.categoryId) nextErrors.categoryId = 'Select category.'
		if (!form.unitId) nextErrors.unitId = 'Select unit.'

		const isReorderRequired = form.kind === 'CONSUMABLE' || form.kind === 'GENERAL_SUPPLY';
		const isReorderOptional = form.kind === 'DISPENSABLE_ASSET';
		
		const reorder = numericValue(form.reorderLevel)
		const minimum = numericValue(form.minimumStock)
		const maximum = numericValue(form.maximumStock)

		if (isReorderRequired) {
			if (form.reorderLevel === '' || Number.isNaN(reorder) || reorder < 0)
				nextErrors.reorderLevel = 'Enter reorder level quantity.'
			if (form.minimumStock === '' || Number.isNaN(minimum) || minimum < 0)
				nextErrors.minimumStock = 'Enter minimum stock quantity.'
			if (form.maximumStock === '' || Number.isNaN(maximum) || maximum < 0)
				nextErrors.maximumStock = 'Enter maximum stock quantity.'
			if (!Number.isNaN(minimum) && !Number.isNaN(maximum) && maximum < minimum)
				nextErrors.maximumStock = 'Maximum stock must be at least minimum stock.'
			if (!Number.isNaN(reorder) && !Number.isNaN(minimum) && !Number.isNaN(maximum) && (reorder < minimum || reorder > maximum))
				nextErrors.reorderLevel = 'Reorder level must be between minimum and maximum stock.'
		} else if (isReorderOptional) {
			if (form.reorderLevel !== '' && (Number.isNaN(reorder) || reorder < 0))
				nextErrors.reorderLevel = 'Reorder level must be a non-negative number.'
			if (form.minimumStock !== '' && (Number.isNaN(minimum) || minimum < 0))
				nextErrors.minimumStock = 'Minimum stock must be a non-negative number.'
			if (form.maximumStock !== '' && (Number.isNaN(maximum) || maximum < 0))
				nextErrors.maximumStock = 'Maximum stock must be a non-negative number.'
			
			const valMin = form.minimumStock !== '' ? minimum : 0;
			const valMax = form.maximumStock !== '' ? maximum : Infinity;
			const valReorder = form.reorderLevel !== '' ? reorder : 0;

			if (form.minimumStock !== '' && form.maximumStock !== '' && valMax < valMin)
				nextErrors.maximumStock = 'Maximum stock must be at least minimum stock.'
			if (form.reorderLevel !== '' && (valReorder < valMin || valReorder > valMax))
				nextErrors.reorderLevel = 'Reorder level must be between minimum and maximum stock.'
		}

		if (!form.subCategory) {
			nextErrors.subCategory = 'Select sub-category.'
		}

		if ((form.kind === 'FIXED_ASSET' || form.kind === 'DISPENSABLE_ASSET') && !form.serialNumber?.trim()) {
			nextErrors.serialNumber = 'Serial number is required.'
		}

		if (form.kind === 'FIXED_ASSET' && form.depreciationRate !== '') {
			const rate = Number(form.depreciationRate);
			if (Number.isNaN(rate) || rate < 0 || rate > 100) {
				nextErrors.depreciationRate = 'Enter a valid depreciation rate between 0 and 100%.'
			}
		}

		setErrors(nextErrors)
		if (Object.keys(nextErrors).length) {
			setMessage('Please fix the highlighted fields before saving.')
			notify('warning', 'Please fix the highlighted fields before saving.')
			return
		}
		setSaving(true)
		setMessage('')
		try {
			const body = {
				...form,
				reorderLevel: isReorderRequired || (isReorderOptional && form.reorderLevel !== '') ? reorder : 0,
				minimumStock: isReorderRequired || (isReorderOptional && form.minimumStock !== '') ? minimum : 0,
				maximumStock: isReorderRequired || (isReorderOptional && form.maximumStock !== '') ? maximum : 0,
				depreciationRate: form.kind === 'FIXED_ASSET' && form.depreciationRate !== '' ? Number(form.depreciationRate) : null,
				calibrationDueDate: form.kind === 'DISPENSABLE_ASSET' && form.calibrationDueDate ? new Date(form.calibrationDueDate).toISOString() : null,
			}
			const saved: any = await request(
				form.id ? `/items/${form.id}` : '/items',
				token,
				{ method: form.id ? 'PATCH' : 'POST', body: JSON.stringify(body) }
			)
			const filePatch: any = {}
			if (files.photo)
				filePatch.photoFileId = (
					await uploadFile(token, files.photo, 'item-photo')
				).id
			if (files.document)
				filePatch.documentFileId = (
					await uploadFile(token, files.document, 'item-document')
				).id
			if (Object.keys(filePatch).length)
				await request(`/items/${saved.id}/files`, token, {
					method: 'PATCH',
					body: JSON.stringify(filePatch),
				})
			setForm((current: any) => {
				const nextKind = current.kind || 'GENERAL_SUPPLY';
				const nextSubCategories = getSubCategories(nextKind);
				return {
					...emptyForm,
					categoryId: current.categoryId || master?.categories?.[0]?.id || '',
					unitId: current.unitId || master?.units?.[0]?.id || '',
					defaultLocationId:
						current.defaultLocationId || master?.locations?.[0]?.id || '',
					fundingSourceId:
						current.fundingSourceId || master?.fundingSources?.[0]?.id || '',
					kind: nextKind,
					subCategory: nextSubCategories[0] || '',
					batchTrackingRequired: current.batchTrackingRequired,
					expiryTrackingRequired: current.expiryTrackingRequired,
					barcodeRequired: current.barcodeRequired,
				};
			})
			setFiles({})
			const message = form.id
				? 'Item updated successfully.'
				: 'Item registered successfully.'
			setMessage(message)
			notify('success', message)
			await load()
			if (closeEditor) setItemEditorOpen(false)
		} catch (err) {
			const message = errorMessage(err, 'Unable to save item.')
			setMessage(message)
			notify('error', message)
		} finally {
			setSaving(false)
		}
	}
	async function chooseExcelFile() {
		if (isDesktop())
			return pickFileAsBrowserFile('Import item Excel workbook', [
				{ name: 'Excel workbooks', extensions: ['xlsx'] },
			])
		return new Promise<File | undefined>((resolve) => {
			const input = document.createElement('input')
			input.type = 'file'
			input.accept =
				'.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			input.onchange = () => resolve(input.files?.[0])
			input.click()
		})
	}
	async function importExcelItems() {
		const file = await chooseExcelFile()
		if (!file) return
		setImporting(true)
		setMessage('')
		try {
			const body = new FormData()
			body.append('file', file)
			const result = await request<any>('/items/import', token, {
				method: 'POST',
				body,
			})
			const message = `Imported ${result.imported} item rows from Excel (${result.created} created, ${result.updated} updated, ${result.skipped} skipped).`
			setMessage(message)
			notify('success', message)
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to import Excel item list.')
			setMessage(message)
			notify('error', message)
		} finally {
			setImporting(false)
		}
	}
	useEffect(() => {
		const onDesktopImport = () => {
			if (canWrite) void importExcelItems()
			else notify('warning', 'Your role cannot import item records.')
		}
		window.addEventListener('fmoh-import-items', onDesktopImport)
		return () =>
			window.removeEventListener('fmoh-import-items', onDesktopImport)
	}, [canWrite, token, master, page, search])
	async function openDetail(id: string) {
		setDetail(await request(`/items/${id}`, token))
	}
	function edit(row: any, openInModal = false) {
		setForm({
			id: row.id,
			code: row.code,
			gtin: row.gtin ?? '',
			description: row.description,
			kind: row.kind,
			categoryId: row.categoryId,
			unitId: row.unitId,
			defaultLocationId: row.defaultLocationId ?? '',
			fundingSourceId: row.fundingSourceId ?? '',
			reorderLevel: Number(row.reorderLevel),
			minimumStock: Number(row.minimumStock),
			maximumStock: Number(row.maximumStock),
			batchTrackingRequired: Boolean(row.batchTrackingRequired),
			expiryTrackingRequired: Boolean(row.expiryTrackingRequired),
			barcodeRequired: Boolean(row.barcodeRequired),
			subCategory: row.subCategory ?? '',
			serialNumber: row.serialNumber ?? '',
			modelNumber: row.modelNumber ?? '',
			depreciationRate: row.depreciationRate != null ? String(row.depreciationRate) : '',
			maintenanceCycle: row.maintenanceCycle ?? '',
			departmentAssignmentId: row.departmentAssignmentId ?? '',
			calibrationDueDate: row.calibrationDueDate ? new Date(row.calibrationDueDate).toISOString().split('T')[0] : '',
		})
		setMessage(
			'Editing item. Unsafe fields are blocked by the API once stock movement exists.'
		)
		if (openInModal) setItemEditorOpen(true)
	}
	async function deactivate(id: string) {
		if (
			!window.confirm(
				'Deactivate this item? Existing stock and transaction history will remain available for audit.'
			)
		)
			return
		setLoadingAction(`deactivate-${id}`)
		try {
			await request(`/items/${id}/deactivate`, token, { method: 'PATCH' })
			setMessage(
				'Item deactivated. Existing transaction history remains intact.'
			)
			notify('success', 'Item deactivated successfully.')
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to deactivate item.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	const totalPages = Math.max(
		1,
		Math.ceil(Number(data.total ?? 0) / Number(data.pageSize ?? 5))
	)
	return (
		<section className='space-y-5'>
			<Panel
				title='Item Master'
				action={
					<div className='flex flex-wrap items-center gap-2'>
						{canWrite && (
							<button
								type='button'
								disabled={importing}
								className='inline-flex min-h-10 items-center justify-center gap-2 rounded border border-border bg-background/70 px-3 py-2 text-sm font-semibold hover:bg-primary/10 disabled:opacity-60'
								onClick={importExcelItems}
							>
								<Upload size={16} />{' '}
								<LoadingInline
									loading={importing}
									label='Import Excel'
									loadingLabel='Importing...'
								/>
							</button>
						)}
						<SearchBox value={search} onChange={setSearch} />
					</div>
				}
			>
				{canWrite && (
					<form
						onSubmit={createItem}
						className='mb-4 grid gap-3 rounded border border-border p-3 md:grid-cols-6'
					>
						<input
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							placeholder='Item code'
							value={form.code}
							onChange={(e) => setForm({ ...form, code: e.target.value })}
							required
						/>
						{errors.code && (
							<p className='text-xs text-danger'>{errors.code}</p>
						)}
						<input
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							placeholder='GTIN (optional)'
							value={form.gtin}
							onChange={(e) =>
								setForm({ ...form, gtin: e.target.value.replace(/\D/g, '') })
							}
						/>
						{errors.gtin && (
							<p className='text-xs text-danger'>{errors.gtin}</p>
						)}
						<input
							className='rounded border border-border bg-background px-3 py-2 text-sm md:col-span-2'
							placeholder='Description / item name'
							value={form.description}
							onChange={(e) =>
								setForm({ ...form, description: e.target.value })
							}
							required
						/>
						{errors.description && (
							<p className='text-xs text-danger md:col-span-2'>
								{errors.description}
							</p>
						)}
						<select
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							value={form.kind}
							onChange={(e) => handleKindChange(e.target.value)}
						>
							<option value=''>Select asset type</option>
							<option value='FIXED_ASSET'>Fixed Asset</option>
							<option value='DISPENSABLE_ASSET'>Dispensable Asset</option>
							<option value='GENERAL_SUPPLY'>General Supply</option>
							<option value='CONSUMABLE'>Consumable</option>
						</select>
						<select
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							value={form.subCategory}
							onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
							required
						>
							<option value=''>Select sub-category</option>
							{getSubCategories(form.kind).map((subCat) => (
								<option key={subCat} value={subCat}>
									{subCat}
								</option>
							))}
						</select>
						{errors.subCategory && (
							<p className='text-xs text-danger'>{errors.subCategory}</p>
						)}
						<select
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							value={form.categoryId}
							onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
							required
						>
							<option value=''>Select category</option>
							{master?.categories?.map((category: any) => (
								<option key={category.id} value={category.id}>
									{category.name}
								</option>
							))}
						</select>
						<select
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							value={form.unitId}
							onChange={(e) => setForm({ ...form, unitId: e.target.value })}
							required
						>
							<option value=''>Select unit</option>
							{master?.units?.map((unit: any) => (
								<option key={unit.id} value={unit.id}>
									{unit.name} ({unit.symbol})
								</option>
							))}
						</select>
						<select
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							value={form.defaultLocationId}
							onChange={(e) =>
								setForm({ ...form, defaultLocationId: e.target.value })
							}
							required
						>
							<option value=''>Select default store</option>
							{master?.locations?.map((location: any) => (
								<option key={location.id} value={location.id}>
									{location.name}
								</option>
							))}
						</select>
						<select
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							value={form.fundingSourceId}
							onChange={(e) =>
								setForm({ ...form, fundingSourceId: e.target.value })
							}
							required
						>
							<option value=''>Select funding source</option>
							{master?.fundingSources?.map((source: any) => (
								<option key={source.id} value={source.id}>
									{source.name}
								</option>
							))}
						</select>
						{form.kind !== 'FIXED_ASSET' && (
							<>
								<label className='grid gap-1 text-xs text-muted-foreground'>
									Reorder level {form.kind === 'DISPENSABLE_ASSET' ? '(optional)' : ''}
									<input
										className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
										type='number'
										min='0'
										placeholder='Reorder level quantity'
										value={form.reorderLevel}
										onChange={(e) =>
											setForm({ ...form, reorderLevel: e.target.value })
										}
									/>
									{errors.reorderLevel && (
										<span className='text-danger'>{errors.reorderLevel}</span>
									)}
								</label>
								<label className='grid gap-1 text-xs text-muted-foreground'>
									Minimum stock {form.kind === 'DISPENSABLE_ASSET' ? '(optional)' : ''}
									<input
										className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
										type='number'
										min='0'
										placeholder='Minimum stock quantity'
										value={form.minimumStock}
										onChange={(e) =>
											setForm({ ...form, minimumStock: e.target.value })
										}
									/>
									{errors.minimumStock && (
										<span className='text-danger'>{errors.minimumStock}</span>
									)}
								</label>
								<label className='grid gap-1 text-xs text-muted-foreground'>
									Maximum stock {form.kind === 'DISPENSABLE_ASSET' ? '(optional)' : ''}
									<input
										className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
										type='number'
										min='0'
										placeholder='Maximum stock quantity'
										value={form.maximumStock}
										onChange={(e) =>
											setForm({ ...form, maximumStock: e.target.value })
										}
									/>
									{errors.maximumStock && (
										<span className='text-danger'>{errors.maximumStock}</span>
									)}
								</label>
							</>
						)}
						{form.kind === 'GENERAL_SUPPLY' && (
							<>
								<label className='option-field'>
									<input
										type='checkbox'
										checked={form.batchTrackingRequired}
										onChange={(e) =>
											setForm({ ...form, batchTrackingRequired: e.target.checked })
										}
									/>{' '}
									<span>Batch tracking</span>
								</label>
								<label className='option-field'>
									<input
										type='checkbox'
										checked={form.expiryTrackingRequired}
										onChange={(e) =>
											setForm({ ...form, expiryTrackingRequired: e.target.checked })
										}
									/>{' '}
									<span>Expiry tracking</span>
								</label>
							</>
						)}
						{form.kind === 'CONSUMABLE' && (
							<div className='flex gap-4 text-xs text-muted-foreground items-center py-2 md:col-span-2'>
								<span className='font-semibold text-emerald-600'>✓ Batch tracking (Required)</span>
								<span className='font-semibold text-emerald-600'>✓ Expiry tracking (Required)</span>
							</div>
						)}
						{(form.kind === 'FIXED_ASSET' || form.kind === 'DISPENSABLE_ASSET') && (
							<div className='md:col-span-6 border-t border-border pt-3 grid gap-3 md:grid-cols-4'>
								<label className='grid gap-1 text-xs text-muted-foreground'>
									Serial number (Required)
									<input
										className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
										placeholder='Serial number'
										value={form.serialNumber}
										onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
										required
									/>
									{errors.serialNumber && (
										<span className='text-danger'>{errors.serialNumber}</span>
									)}
								</label>
								
								{form.kind === 'FIXED_ASSET' && (
									<>
										<label className='grid gap-1 text-xs text-muted-foreground'>
											Model number
											<input
												className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
												placeholder='Model number'
												value={form.modelNumber}
												onChange={(e) => setForm({ ...form, modelNumber: e.target.value })}
											/>
										</label>
										<label className='grid gap-1 text-xs text-muted-foreground'>
											Depreciation rate (%)
											<input
												className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
												type='number'
												step='0.01'
												min='0'
												max='100'
												placeholder='Depreciation rate'
												value={form.depreciationRate}
												onChange={(e) => setForm({ ...form, depreciationRate: e.target.value })}
											/>
											{errors.depreciationRate && (
												<span className='text-danger'>{errors.depreciationRate}</span>
											)}
										</label>
										<label className='grid gap-1 text-xs text-muted-foreground'>
											Maintenance cycle
											<input
												className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
												placeholder='e.g. 6 months'
												value={form.maintenanceCycle}
												onChange={(e) => setForm({ ...form, maintenanceCycle: e.target.value })}
											/>
										</label>
									</>
								)}
								
								{form.kind === 'DISPENSABLE_ASSET' && (
									<>
										<label className='grid gap-1 text-xs text-muted-foreground'>
											Department Assignment
											<select
												className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
												value={form.departmentAssignmentId}
												onChange={(e) => setForm({ ...form, departmentAssignmentId: e.target.value })}
											>
												<option value=''>Unassigned</option>
												{master?.departments?.map((dept: any) => (
													<option key={dept.id} value={dept.id}>
														{dept.name}
													</option>
												))}
											</select>
										</label>
										<label className='grid gap-1 text-xs text-muted-foreground'>
											Calibration due date
											<input
												className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
												type='date'
												value={form.calibrationDueDate}
												onChange={(e) => setForm({ ...form, calibrationDueDate: e.target.value })}
											/>
										</label>
									</>
								)}
							</div>
						)}
						<label className='option-field'>
							<input
								type='checkbox'
								checked={form.barcodeRequired}
								onChange={(e) =>
									setForm({ ...form, barcodeRequired: e.target.checked })
								}
							/>{' '}
							<span>Barcode/QR</span>
						</label>
						<label className='upload-field md:col-span-2'>
							<span className='upload-field-label'>
								<Image size={16} /> Item photo
							</span>
							{isDesktop() ? (
								<button
									type='button'
									className='upload-field-button'
									onClick={async () => {
										const file = await pickFileAsBrowserFile(
											'Choose item photo',
											[
												{
													name: 'Images',
													extensions: ['png', 'jpg', 'jpeg', 'webp'],
												},
											]
										)
										if (file)
											setFiles((current) => ({ ...current, photo: file }))
									}}
								>
									Choose File
								</button>
							) : (
								<input
									type='file'
									accept='image/*'
									onChange={(e) =>
										setFiles({ ...files, photo: e.target.files?.[0] })
									}
								/>
							)}
						</label>
						<label className='upload-field md:col-span-2'>
							<span className='upload-field-label'>
								<Upload size={16} /> Supporting document
							</span>
							{isDesktop() ? (
								<button
									type='button'
									className='upload-field-button'
									onClick={async () => {
										const file = await pickFileAsBrowserFile(
											'Choose supporting document',
											[
												{
													name: 'Documents',
													extensions: [
														'png',
														'jpg',
														'jpeg',
														'webp',
														'pdf',
														'doc',
														'docx',
													],
												},
											]
										)
										if (file)
											setFiles((current) => ({ ...current, document: file }))
									}}
								>
									Choose File
								</button>
							) : (
								<input
									type='file'
									accept='image/*,.pdf,.doc,.docx'
									onChange={(e) =>
										setFiles({ ...files, document: e.target.files?.[0] })
									}
								/>
							)}
						</label>
						<div className='md:col-span-6 flex flex-wrap justify-center gap-3'>
							<button
								disabled={saving}
								className='primary-action-button min-w-[12rem]'
							>
								<Plus size={16} />{' '}
								<LoadingInline
									loading={saving}
									label={form.id ? 'Save item' : 'Register'}
									loadingLabel='Saving...'
								/>
							</button>
							{form.id && (
								<button
									type='button'
									className='min-h-10 min-w-[9rem] rounded border border-border px-3 py-2 text-sm'
									onClick={() =>
										setForm({
											...emptyForm,
											categoryId: master?.categories?.[0]?.id || '',
											unitId: master?.units?.[0]?.id || '',
											defaultLocationId: master?.locations?.[0]?.id || '',
											fundingSourceId: master?.fundingSources?.[0]?.id || '',
										})
									}
								>
									Cancel
								</button>
							)}
						</div>
						{(files.photo || files.document) && (
							<div className='md:col-span-6 flex flex-wrap gap-3 text-xs text-muted-foreground'>
								{files.photo && (
									<span className='rounded border border-border px-2 py-1'>
										Photo ready: {files.photo.name}
									</span>
								)}
								{files.document && (
									<span className='rounded border border-border px-2 py-1'>
										Document ready: {files.document.name}
									</span>
								)}
							</div>
						)}
					</form>
				)}
				{message && (
					<p className='mb-3 rounded border border-border bg-muted px-3 py-2 text-sm'>
						{message}
					</p>
				)}
				<div className='mb-3 flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-background/45 px-3 py-2'>
					<span className='text-sm text-muted-foreground'>
						{showItemList
							? `${data.total ?? 0} matching items`
							: 'Item list hidden until requested.'}
					</span>
					<button
						className='rounded border border-border px-3 py-2 text-sm'
						onClick={() => setShowItemList((current) => !current)}
					>
						{showItemList ? 'Hide Item List' : 'Show Item List'}
					</button>
				</div>
				{showItemList && (
					<DataTable
						rows={data.items ?? []}
						columns={[
							{ key: 'code', label: 'Code' },
							{
								key: 'gtin',
								label: 'GTIN',
								render: (row) => row.gtin ?? 'N/A',
							},
							{ key: 'description', label: 'Description' },
							{
								key: 'category',
								label: 'Category',
								render: (row) => row.category?.name,
							},
							{
								key: 'subCategory',
								label: 'Sub-Category',
								render: (row) => row.subCategory ?? 'N/A',
							},
							{ key: 'unit', label: 'Unit', render: (row) => row.unit?.symbol },
							{
								key: 'fundingSource',
								label: 'Funding',
								render: (row) => row.fundingSource?.name,
							},
							{ key: 'currentStock', label: 'Stock' },
							{
								key: 'stockStatus',
								label: 'Stock status',
								render: (row) => row.stockStatus?.replaceAll('_', ' '),
							},
							{ key: 'reorderLevel', label: 'Reorder' },
							{
								key: 'active',
								label: 'Status',
								render: () => (
									<span className='rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-800'>
										Active
									</span>
								),
							},
							{
								key: 'actions',
								label: 'Actions',
								render: (row) => (
									<div className='flex flex-wrap gap-2'>
										<button
											className='rounded border border-border px-2 py-1 text-xs'
											onClick={() => openDetail(row.id)}
										>
											Bin Card
										</button>
										{canWrite && (
											<button
												className='rounded border border-border px-2 py-1 text-xs'
												onClick={() => edit(row, true)}
											>
												Edit
											</button>
										)}
										{canDeactivate && row.active && (
											<button
												disabled={loadingAction === `deactivate-${row.id}`}
												className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
												onClick={() => deactivate(row.id)}
											>
												<LoadingInline
													loading={loadingAction === `deactivate-${row.id}`}
													label='Deactivate'
													loadingLabel='Saving...'
												/>
											</button>
										)}
									</div>
								),
							},
						]}
					/>
				)}
				{showItemList && (
					<div className='mt-3 flex items-center justify-between text-sm text-muted-foreground'>
						<span>
							Page {data.page ?? 1} of {totalPages} ({data.total ?? 0} items)
						</span>
						<div className='flex gap-2'>
							<button
								className='rounded border border-border px-3 py-1 disabled:opacity-50'
								disabled={page <= 1}
								onClick={() => setPage((current) => Math.max(1, current - 1))}
							>
								Previous
							</button>
							<button
								className='rounded border border-border px-3 py-1 disabled:opacity-50'
								disabled={page >= totalPages}
								onClick={() =>
									setPage((current) => Math.min(totalPages, current + 1))
								}
							>
								Next
							</button>
						</div>
					</div>
				)}
			</Panel>
			{detail && (
				<Modal
					title={`Bin Card: ${detail.code}`}
					description='Chronological item transaction card from registration through receipts, issues, and current balances.'
					onClose={() => setDetail(undefined)}
				>
					<div className='mb-4 flex flex-wrap gap-2'>
						<button
							className='inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm'
							onClick={() => printCurrentView()}
						>
							<Printer size={16} /> Print bin card
						</button>
					</div>
					<BinCardView detail={detail} />
					{detail.kind === 'FIXED_ASSET' && (
						<AssetCustodyPanel
							token={token}
							detail={detail}
							master={master}
							canWrite={canWrite}
							onRefresh={() => openDetail(detail.id)}
						/>
					)}
				</Modal>
			)}
			{itemEditorOpen && (
				<Modal
					title={`Edit Item: ${form.code || 'Item'}`}
					description='Update the active item record without leaving the code and GTIN list.'
					onClose={() => setItemEditorOpen(false)}
				>
					<form
						onSubmit={(event) => createItem(event, true)}
						className='grid gap-3 md:grid-cols-2'
					>
						<input
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							placeholder='Item code'
							value={form.code}
							onChange={(e) => setForm({ ...form, code: e.target.value })}
							required
						/>
						<input
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							placeholder='GTIN (optional)'
							value={form.gtin}
							onChange={(e) =>
								setForm({ ...form, gtin: e.target.value.replace(/\D/g, '') })
							}
						/>
						<input
							className='rounded border border-border bg-background px-3 py-2 text-sm md:col-span-2'
							placeholder='Description / item name'
							value={form.description}
							onChange={(e) =>
								setForm({ ...form, description: e.target.value })
							}
							required
						/>
						<select
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							value={form.kind}
							onChange={(e) => handleKindChange(e.target.value)}
						>
							<option value='FIXED_ASSET'>Fixed Asset</option>
							<option value='DISPENSABLE_ASSET'>Dispensable Asset</option>
							<option value='GENERAL_SUPPLY'>General Supply</option>
							<option value='CONSUMABLE'>Consumable</option>
						</select>
						<select
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							value={form.subCategory}
							onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
							required
						>
							<option value=''>Select sub-category</option>
							{getSubCategories(form.kind).map((subCat) => (
								<option key={subCat} value={subCat}>
									{subCat}
								</option>
							))}
						</select>
						{errors.subCategory && (
							<p className='text-xs text-danger md:col-span-2'>{errors.subCategory}</p>
						)}
						<select
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							value={form.categoryId}
							onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
							required
						>
							{master?.categories?.map((category: any) => (
								<option key={category.id} value={category.id}>
									{category.name}
								</option>
							))}
						</select>
						<select
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							value={form.unitId}
							onChange={(e) => setForm({ ...form, unitId: e.target.value })}
							required
						>
							{master?.units?.map((unit: any) => (
								<option key={unit.id} value={unit.id}>
									{unit.name} ({unit.symbol})
								</option>
							))}
						</select>
						<select
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							value={form.defaultLocationId}
							onChange={(e) =>
								setForm({ ...form, defaultLocationId: e.target.value })
							}
							required
						>
							{master?.locations?.map((location: any) => (
								<option key={location.id} value={location.id}>
									{location.name}
								</option>
							))}
						</select>
						<select
							className='rounded border border-border bg-background px-3 py-2 text-sm'
							value={form.fundingSourceId}
							onChange={(e) =>
								setForm({ ...form, fundingSourceId: e.target.value })
							}
							required
						>
							{master?.fundingSources?.map((source: any) => (
								<option key={source.id} value={source.id}>
									{source.name}
								</option>
							))}
						</select>
						{form.kind !== 'FIXED_ASSET' && (
							<>
								<label className='grid gap-1 text-xs text-muted-foreground'>
									Reorder level {form.kind === 'DISPENSABLE_ASSET' ? '(optional)' : ''}
									<input
										className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
										type='number'
										min='0'
										placeholder='Reorder level quantity'
										value={form.reorderLevel}
										onChange={(e) =>
											setForm({ ...form, reorderLevel: e.target.value })
										}
									/>
									{errors.reorderLevel && (
										<span className='text-danger'>{errors.reorderLevel}</span>
									)}
								</label>
								<label className='grid gap-1 text-xs text-muted-foreground'>
									Minimum stock {form.kind === 'DISPENSABLE_ASSET' ? '(optional)' : ''}
									<input
										className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
										type='number'
										min='0'
										placeholder='Minimum stock quantity'
										value={form.minimumStock}
										onChange={(e) =>
											setForm({ ...form, minimumStock: e.target.value })
										}
									/>
									{errors.minimumStock && (
										<span className='text-danger'>{errors.minimumStock}</span>
									)}
								</label>
								<label className='grid gap-1 text-xs text-muted-foreground'>
									Maximum stock {form.kind === 'DISPENSABLE_ASSET' ? '(optional)' : ''}
									<input
										className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
										type='number'
										min='0'
										placeholder='Maximum stock quantity'
										value={form.maximumStock}
										onChange={(e) =>
											setForm({ ...form, maximumStock: e.target.value })
										}
									/>
									{errors.maximumStock && (
										<span className='text-danger'>{errors.maximumStock}</span>
									)}
								</label>
							</>
						)}
						{form.kind === 'GENERAL_SUPPLY' && (
							<div className='flex flex-wrap items-center gap-3 md:col-span-2'>
								<label className='option-field'>
									<input
										type='checkbox'
										checked={form.batchTrackingRequired}
										onChange={(e) =>
											setForm({ ...form, batchTrackingRequired: e.target.checked })
										}
									/>{' '}
									<span>Batch tracking</span>
								</label>
								<label className='option-field'>
									<input
										type='checkbox'
										checked={form.expiryTrackingRequired}
										onChange={(e) =>
											setForm({ ...form, expiryTrackingRequired: e.target.checked })
										}
									/>{' '}
									<span>Expiry tracking</span>
								</label>
							</div>
						)}
						{form.kind === 'CONSUMABLE' && (
							<div className='flex gap-4 text-xs text-muted-foreground items-center py-2 md:col-span-2'>
								<span className='font-semibold text-emerald-600'>✓ Batch tracking (Required)</span>
								<span className='font-semibold text-emerald-600'>✓ Expiry tracking (Required)</span>
							</div>
						)}
						{(form.kind === 'FIXED_ASSET' || form.kind === 'DISPENSABLE_ASSET') && (
							<div className='md:col-span-2 border-t border-border pt-3 grid gap-3 md:grid-cols-2'>
								<label className='grid gap-1 text-xs text-muted-foreground md:col-span-2'>
									Serial number (Required)
									<input
										className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
										placeholder='Serial number'
										value={form.serialNumber}
										onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
										required
									/>
									{errors.serialNumber && (
										<span className='text-danger'>{errors.serialNumber}</span>
									)}
								</label>
								
								{form.kind === 'FIXED_ASSET' && (
									<>
										<label className='grid gap-1 text-xs text-muted-foreground'>
											Model number
											<input
												className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
												placeholder='Model number'
												value={form.modelNumber}
												onChange={(e) => setForm({ ...form, modelNumber: e.target.value })}
											/>
										</label>
										<label className='grid gap-1 text-xs text-muted-foreground'>
											Depreciation rate (%)
											<input
												className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
												type='number'
												step='0.01'
												min='0'
												max='100'
												placeholder='Depreciation rate'
												value={form.depreciationRate}
												onChange={(e) => setForm({ ...form, depreciationRate: e.target.value })}
											/>
											{errors.depreciationRate && (
												<span className='text-danger'>{errors.depreciationRate}</span>
											)}
										</label>
										<label className='grid gap-1 text-xs text-muted-foreground md:col-span-2'>
											Maintenance cycle
											<input
												className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
												placeholder='e.g. 6 months'
												value={form.maintenanceCycle}
												onChange={(e) => setForm({ ...form, maintenanceCycle: e.target.value })}
											/>
										</label>
									</>
								)}
								
								{form.kind === 'DISPENSABLE_ASSET' && (
									<>
										<label className='grid gap-1 text-xs text-muted-foreground'>
											Department Assignment
											<select
												className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
												value={form.departmentAssignmentId}
												onChange={(e) => setForm({ ...form, departmentAssignmentId: e.target.value })}
											>
												<option value=''>Unassigned</option>
												{master?.departments?.map((dept: any) => (
													<option key={dept.id} value={dept.id}>
														{dept.name}
													</option>
												))}
											</select>
										</label>
										<label className='grid gap-1 text-xs text-muted-foreground'>
											Calibration due date
											<input
												className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
												type='date'
												value={form.calibrationDueDate}
												onChange={(e) => setForm({ ...form, calibrationDueDate: e.target.value })}
											/>
										</label>
									</>
								)}
							</div>
						)}
						<div className='flex flex-wrap items-center gap-3 md:col-span-2'>
							<label className='option-field'>
								<input
									type='checkbox'
									checked={form.barcodeRequired}
									onChange={(e) =>
										setForm({ ...form, barcodeRequired: e.target.checked })
									}
								/>{' '}
								<span>Barcode/QR</span>
							</label>
						</div>
						<div className='flex flex-wrap justify-end gap-3 md:col-span-2'>
							<button
								type='button'
								className='min-h-10 min-w-[8rem] rounded border border-border px-3 py-2 text-sm'
								onClick={() => setItemEditorOpen(false)}
							>
								Cancel
							</button>
							<button
								disabled={saving}
								className='primary-action-button min-w-[10rem]'
							>
								<LoadingInline
									loading={saving}
									label='Save item'
									loadingLabel='Saving...'
								/>
							</button>
						</div>
					</form>
				</Modal>
			)}
		</section>
	)
}

function AssetCustodyPanel({
	token,
	detail,
	master,
	canWrite,
	onRefresh,
}: {
	token: string
	detail: any
	master: any
	canWrite: boolean
	onRefresh: () => Promise<void>
}) {
	const [message, setMessage] = useState('')
	const [loadingAction, setLoadingAction] = useState('')
	const emptyCustodyForm = {
		assetTag: '',
		serialNumber: '',
		custodianName: '',
		custodianDepartmentId: master?.departments?.[0]?.id || '',
		location: '',
		condition: 'GOOD',
		assignedAt: new Date().toISOString().slice(0, 10),
		notes: '',
	}
	const [form, setForm] = useState<any>(emptyCustodyForm)
	async function assign(event: React.FormEvent) {
		event.preventDefault()
		setLoadingAction('assign-custody')
		try {
			await request(`/items/${detail.id}/custody`, token, {
				method: 'POST',
				body: JSON.stringify(form),
			})
			setForm(emptyCustodyForm)
			setMessage('Asset custody assigned.')
			notify('success', 'Asset custody assigned.')
			await onRefresh()
		} catch (err) {
			const message = errorMessage(err, 'Unable to assign asset custody.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	async function returnAsset(row: any) {
		if (
			!window.confirm(
				`Mark ${row.assetTag} as returned from ${row.custodianName}?`
			)
		)
			return
		setLoadingAction(`return-${row.id}`)
		try {
			await request(`/asset-custody/${row.id}/return`, token, {
				method: 'PATCH',
				body: JSON.stringify({
					notes: 'Returned through item custody register.',
				}),
			})
			setMessage('Asset marked as returned.')
			notify('success', 'Asset marked as returned.')
			await onRefresh()
		} catch (err) {
			const message = errorMessage(err, 'Unable to return asset.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	return (
		<section className='mt-5 space-y-3 rounded-lg border border-border bg-background/45 p-3'>
			<div>
				<h3 className='text-sm font-semibold'>Serial custody register</h3>
				<p className='mt-1 text-xs text-muted-foreground'>
					Track each fixed asset by tag, serial number, custodian, department,
					location, and return state.
				</p>
			</div>
			{canWrite && (
				<form onSubmit={assign} className='grid gap-3 md:grid-cols-4'>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						placeholder='Asset tag'
						value={form.assetTag}
						onChange={(e) => setForm({ ...form, assetTag: e.target.value })}
						required
					/>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						placeholder='Serial number'
						value={form.serialNumber}
						onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
						required
					/>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						placeholder='Custodian name'
						value={form.custodianName}
						onChange={(e) =>
							setForm({ ...form, custodianName: e.target.value })
						}
						required
					/>
					<select
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						value={form.custodianDepartmentId}
						onChange={(e) =>
							setForm({ ...form, custodianDepartmentId: e.target.value })
						}
					>
						<option value=''>No department</option>
						{master?.departments?.map((department: any) => (
							<option key={department.id} value={department.id}>
								{department.name}
							</option>
						))}
					</select>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						placeholder='Room / office / field site'
						value={form.location}
						onChange={(e) => setForm({ ...form, location: e.target.value })}
					/>
					<select
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						value={form.condition}
						onChange={(e) => setForm({ ...form, condition: e.target.value })}
					>
						<option value='GOOD'>Good</option>
						<option value='FAIR'>Fair</option>
						<option value='DAMAGED'>Damaged</option>
						<option value='REPAIR_REQUIRED'>Repair required</option>
					</select>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						type='date'
						value={form.assignedAt}
						onChange={(e) => setForm({ ...form, assignedAt: e.target.value })}
					/>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						placeholder='Notes'
						value={form.notes}
						onChange={(e) => setForm({ ...form, notes: e.target.value })}
					/>
					<button
						disabled={loadingAction === 'assign-custody'}
						className='primary-action-button md:col-span-1'
					>
						<LoadingInline
							loading={loadingAction === 'assign-custody'}
							label='Assign asset'
							loadingLabel='Assigning...'
						/>
					</button>
				</form>
			)}
			{message && (
				<p className='rounded border border-border bg-muted px-3 py-2 text-sm'>
					{message}
				</p>
			)}
			<DataTable
				rows={detail.assetCustodies ?? []}
				empty='No custody records for this fixed asset.'
				columns={[
					{ key: 'assetTag', label: 'Asset tag' },
					{ key: 'serialNumber', label: 'Serial' },
					{ key: 'custodianName', label: 'Custodian' },
					{
						key: 'department',
						label: 'Department',
						render: (row) => row.custodianDepartment?.name ?? 'N/A',
					},
					{
						key: 'location',
						label: 'Location',
						render: (row) => row.location ?? 'N/A',
					},
					{
						key: 'condition',
						label: 'Condition',
						render: (row) => row.condition?.replaceAll('_', ' ') ?? 'N/A',
					},
					{
						key: 'status',
						label: 'Status',
						render: (row) => <StatusPill value={row.status} />,
					},
					{
						key: 'assignedAt',
						label: 'Assigned',
						render: (row) => formatDate(row.assignedAt),
					},
					{
						key: 'returnedAt',
						label: 'Returned',
						render: (row) =>
							row.returnedAt ? formatDate(row.returnedAt) : 'N/A',
					},
					{
						key: 'action',
						label: 'Action',
						render: (row) =>
							canWrite && row.status !== 'RETURNED' ? (
								<button
									disabled={loadingAction === `return-${row.id}`}
									className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
									onClick={() => returnAsset(row)}
								>
									<LoadingInline
										loading={loadingAction === `return-${row.id}`}
										label='Return'
										loadingLabel='Saving...'
									/>
								</button>
							) : (
								'N/A'
							),
					},
				]}
			/>
		</section>
	)
}

function Receiving({
	token,
	user,
	onOpenStorage,
}: {
	token: string
	user: User
	onOpenStorage: () => void
}) {
	const [receipts, setReceipts] = useState<any[]>([])
	const [master, setMaster] = useState<any>()
	const [items, setItems] = useState<any[]>([])
	const [message, setMessage] = useState('')
	const [loadingAction, setLoadingAction] = useState('')
	const canCreateReceipt = user.permissions.includes(permissions.RECEIPT_WRITE)
	const canInspectReceipt = user.permissions.includes(
		permissions.INSPECTION_WRITE
	)
	const canStoreAccepted = user.permissions.includes(permissions.STORAGE_WRITE)
	const [filters, setFilters] = useState({ search: '' })
	const [detail, setDetail] = useState<any>()
	const [model19Record, setModel19Record] = useState<any | null>(null)
	const [form, setForm] = useState<any>({
		sourceType: 'PROCUREMENT',
		supplierDonorId: '',
		purchaseOrderRef: '',
		donationLetterRef: '',
		governmentAllocationRef: '',
		projectSupportRef: '',
		deliveryNoteRef: '',
		remarks: '',
		lines: [
			{
				itemId: '',
				quantityReceived: '',
				unitPrice: '',
				batchNumber: '',
				expiryDate: '',
				fundingSourceId: '',
				remarks: '',
			},
		],
	})
	const load = async () => {
		const params = new URLSearchParams()
		Object.entries(filters).forEach(
			([key, value]) => value && params.set(key, value)
		)
		const [receiptRows, masterData, itemData] = await Promise.all([
			request<any[]>(`/receipts?${params.toString()}`, token),
			request<any>('/master-data', token),
			request<any>('/items?active=true&pageSize=1000', token),
		])
		setReceipts(receiptRows)
		setMaster(masterData)
		setItems(itemData.items ?? [])
		setForm((current: any) => ({
			...current,
			supplierDonorId:
				current.supplierDonorId || masterData.supplierDonors?.[0]?.id || '',
			lines: current.lines.map((line: any) => ({
				...line,
				itemId: line.itemId || itemData.items?.[0]?.id || '',
				fundingSourceId:
					line.fundingSourceId || masterData.fundingSources?.[0]?.id || '',
			})),
		}))
	}
	useEffect(() => {
		load().catch((err) =>
			setMessage(errorMessage(err, 'Unable to load receiving records.'))
		)
	}, [token, filters])

	async function openModel19(receiptId: string) {
		setLoadingAction(`m19-${receiptId}`)
		try {
			const fullReceipt = await request<any>(`/receipts/${receiptId}`, token)
			setModel19Record(fullReceipt)
		} catch (err) {
			const message = errorMessage(err, 'Unable to load Model 19 receiving voucher.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}

	async function createReceipt(event: React.FormEvent) {
		event.preventDefault()
		if (!items.length) {
			setMessage('Create an item before receiving stock.')
			notify('warning', 'Create an item before receiving stock.')
			return
		}
		if (!form.supplierDonorId) {
			setMessage('Select a supplier or donor before creating the GRN.')
			notify('warning', 'Select a supplier or donor before creating the GRN.')
			return
		}
		if (form.lines.some((line: any) => !line.itemId)) {
			setMessage('Select an item for every received line.')
			notify('warning', 'Select an item for every received line.')
			return
		}
		const missingBatchLine = form.lines.find((line: any) => {
			const item = items.find((i) => i.id === line.itemId)
			const isBatchRequired = item?.kind === 'CONSUMABLE' || Boolean(item?.batchTrackingRequired)
			return isBatchRequired && !line.batchNumber?.trim()
		})
		if (missingBatchLine) {
			const item = items.find((i) => i.id === missingBatchLine.itemId)
			setMessage(`Batch/Lot number is required for ${item?.code || 'received item'}.`)
			notify('warning', `Batch/Lot number is required for ${item?.code || 'received item'}.`)
			return
		}
		const missingExpiryLine = form.lines.find((line: any) => {
			const item = items.find((i) => i.id === line.itemId)
			const isExpiryRequired = item?.kind === 'CONSUMABLE' || Boolean(item?.expiryTrackingRequired)
			return isExpiryRequired && !line.expiryDate
		})
		if (missingExpiryLine) {
			const item = items.find((i) => i.id === missingExpiryLine.itemId)
			setMessage(`Expiry date is required for ${item?.code || 'received item'}.`)
			notify('warning', `Expiry date is required for ${item?.code || 'received item'}.`)
			return
		}
		if (
			form.lines.some(
				(line: any) =>
					numericValue(line.quantityReceived) <= 0 ||
					Number.isNaN(numericValue(line.quantityReceived))
			)
		) {
			setMessage('Quantity received is required for every received item line.')
			notify(
				'warning',
				'Quantity received is required for every received item line.'
			)
			return
		}
		if (
			form.lines.some(
				(line: any) =>
					numericValue(line.unitPrice) < 0 ||
					Number.isNaN(numericValue(line.unitPrice))
			)
		) {
			setMessage('Unit price is required for every received item line.')
			notify('warning', 'Unit price is required for every received item line.')
			return
		}
		setLoadingAction('create')
		try {
			await request('/receipts', token, {
				method: 'POST',
				body: JSON.stringify({
					...form,
					lines: form.lines.map((line: any) => ({
						...line,
						quantityReceived: Number(line.quantityReceived),
						unitPrice: Number(line.unitPrice),
						batchNumber: line.batchNumber || undefined,
						expiryDate: line.expiryDate || undefined,
						remarks: line.remarks || undefined,
					})),
				}),
			})
			setMessage('Draft GRN created. Submit it for inspection when ready.')
			notify('success', 'Draft GRN created successfully.')
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to create GRN.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}

	async function submitReceipt(id: string) {
		setLoadingAction(`submit-${id}`)
		try {
			await request(`/receipts/${id}/submit`, token, { method: 'POST' })
			setMessage('GRN submitted for inspection.')
			notify('success', 'GRN submitted for inspection.')
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to submit GRN.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}

	async function inspectLine(line: any, mode: 'accept' | 'partial' | 'reject') {
		const received = Number(line.quantityReceived)
		const accepted =
			mode === 'reject'
				? 0
				: mode === 'partial'
					? Math.max(received - 1, 0)
					: received
		const rejected = received - accepted
		setLoadingAction(`${mode}-${line.id}`)
		try {
			await request(`/receipts/lines/${line.id}/inspect`, token, {
				method: 'POST',
				body: JSON.stringify({
					quantityVerified: received,
					quantityAccepted: accepted,
					quantityRejected: rejected,
					qualityStatus:
						mode === 'accept'
							? 'PASS'
							: mode === 'partial'
								? 'PARTIAL'
								: 'FAIL',
					qualityNotes:
						mode === 'accept'
							? 'Accepted from operational UI'
							: 'Rejected/partial from operational UI',
					rejectionReason:
						rejected > 0 ? 'Inspection variance or quality issue' : undefined,
					storeLocationId: master?.locations?.[0]?.id,
					shelfCode: 'A1',
					binCode: 'B01',
				}),
			})
			const message =
				accepted > 0
					? 'Accepted stock moved to Pending Storage Allocation.'
					: 'Rejected quantity recorded without available stock.'
			setMessage(message)
			notify('success', message)
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to inspect receipt line.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}

	function updateLine(index: number, patch: any) {
		setForm((current: any) => ({
			...current,
			lines: current.lines.map((line: any, lineIndex: number) =>
				lineIndex === index ? { ...line, ...patch } : line
			),
		}))
	}
	function addLine() {
		setForm((current: any) => ({
			...current,
			lines: [
				...current.lines,
				{
					itemId: items[0]?.id || '',
					quantityReceived: '',
					unitPrice: '',
					batchNumber: '',
					expiryDate: '',
					fundingSourceId: master?.fundingSources?.[0]?.id || '',
					remarks: '',
				},
			],
		}))
	}
	async function openDetail(id: string) {
		setLoadingAction(`detail-${id}`)
		try {
			setDetail(await request(`/receipts/${id}`, token))
		} catch (err) {
			const message = errorMessage(err, 'Unable to open GRN detail.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	const sourceRefField =
		form.sourceType === 'PROCUREMENT'
			? 'purchaseOrderRef'
			: form.sourceType === 'DONATION'
				? 'donationLetterRef'
				: form.sourceType === 'GOVERNMENT_ALLOCATION'
					? 'governmentAllocationRef'
					: 'projectSupportRef'
	const sourceRefPlaceholder =
		form.sourceType === 'PROCUREMENT'
			? 'Purchase Order'
			: form.sourceType === 'DONATION'
				? 'Donation Letter'
				: form.sourceType === 'GOVERNMENT_ALLOCATION'
					? 'Allocation Reference'
					: 'Project Support Reference'
	const showLineFundingSource = form.sourceType !== 'PROCUREMENT'
	const lines = receipts.flatMap((receipt) =>
		receipt.lines.map((line: any) => ({
			...line,
			receiptId: receipt.id,
			grnNumber: receipt.grnNumber,
			sourceType: receipt.sourceType,
			receiptStatus: receipt.status,
			supplierDonor: receipt.supplierDonor,
		}))
	)
	return (
		<section className='space-y-5'>
			<Panel title='Goods Receiving'>
				<div className='mb-4 rounded border border-border p-3'>
					<input
						className='h-11 rounded border border-border bg-background px-3 text-sm'
						placeholder='Search GRN, PO, supplier'
						value={filters.search}
						onChange={(e) => setFilters({ ...filters, search: e.target.value })}
					/>
				</div>
				{canCreateReceipt && (
					<form
						onSubmit={createReceipt}
						className='mb-4 space-y-3 rounded border border-border p-3'
					>
						<div className='grid gap-3 md:grid-cols-6'>
							<SearchableSelect
								value={form.sourceType}
								onChange={(value) => setForm({ ...form, sourceType: value })}
								options={[
									{ value: 'PROCUREMENT', label: 'Procurement' },
									{ value: 'DONATION', label: 'Donation' },
									{
										value: 'GOVERNMENT_ALLOCATION',
										label: 'Government allocation',
									},
									{ value: 'PROJECT_SUPPORT', label: 'Project support' },
								]}
							/>
							<select
								className='rounded border border-border bg-background px-3 py-2 text-sm'
								value={form.supplierDonorId}
								onChange={(e) =>
									setForm({ ...form, supplierDonorId: e.target.value })
								}
								required
							>
								<option value=''>
									{master?.supplierDonors?.length
										? 'Select supplier / donor'
										: 'No supplier / donor available'}
								</option>
								{master?.supplierDonors?.map((supplier: any) => (
									<option key={supplier.id} value={supplier.id}>
										{supplier.name}
									</option>
								))}
							</select>
							<input
								className='rounded border border-border bg-background px-3 py-2 text-sm'
								placeholder={sourceRefPlaceholder}
								value={form[sourceRefField]}
								onChange={(e) =>
									setForm({ ...form, [sourceRefField]: e.target.value })
								}
								required
							/>
							<input
								className='rounded border border-border bg-background px-3 py-2 text-sm'
								placeholder='Delivery Note'
								value={form.deliveryNoteRef}
								onChange={(e) =>
									setForm({ ...form, deliveryNoteRef: e.target.value })
								}
							/>
							<input
								className='rounded border border-border bg-background px-3 py-2 text-sm md:col-span-2'
								placeholder='Remarks'
								value={form.remarks}
								onChange={(e) => setForm({ ...form, remarks: e.target.value })}
							/>
						</div>
						{form.lines.map((line: any, index: number) => {
							const selectedItem = items.find((i) => i.id === line.itemId)
							const isFixedOrDispensable = selectedItem?.kind === 'FIXED_ASSET' || selectedItem?.kind === 'DISPENSABLE_ASSET'
							const isBatchRequired = selectedItem?.kind === 'CONSUMABLE' || Boolean(selectedItem?.batchTrackingRequired)
							const isExpiryRequired = selectedItem?.kind === 'CONSUMABLE' || Boolean(selectedItem?.expiryTrackingRequired)
							return (
							<div
								key={index}
								className={cn(
									'grid min-w-0 items-start gap-3 rounded border border-border p-3',
									showLineFundingSource
										? 'lg:grid-cols-[minmax(220px,2fr)_minmax(6.5rem,1fr)_minmax(6.5rem,1fr)_minmax(7rem,1fr)_minmax(8rem,1fr)_minmax(9rem,1fr)_minmax(10rem,1.1fr)]'
										: 'lg:grid-cols-[minmax(240px,2fr)_minmax(6.5rem,1fr)_minmax(6.5rem,1fr)_minmax(7rem,1fr)_minmax(8rem,1fr)_minmax(9rem,1fr)]'
								)}
							>
								<SearchableSelect
									className='h-11'
									value={line.itemId}
									onChange={(value) => updateLine(index, { itemId: value })}
									options={items.map((item) => ({
										value: item.id,
										label: `${item.code} - ${item.description}`,
									}))}
									placeholder={
										items.length
											? 'Select item to receive'
											: 'No active items available'
									}
								/>
								<input
									className='h-11 rounded border border-border bg-background px-3 text-sm'
									type='number'
									min='1'
									placeholder='Quantity'
									value={line.quantityReceived}
									onChange={(e) =>
										updateLine(index, { quantityReceived: e.target.value })
									}
								/>
								<input
									className='h-11 rounded border border-border bg-background px-3 text-sm'
									type='number'
									min='0'
									step='0.01'
									placeholder='Unit price'
									value={line.unitPrice}
									onChange={(e) =>
										updateLine(index, { unitPrice: e.target.value })
									}
								/>
								<input
									className='h-11 rounded border border-border bg-muted px-3 text-sm'
									readOnly
									placeholder='Total price'
									value={
										line.quantityReceived !== '' && line.unitPrice !== ''
											? formatNumber(
													numericValue(line.quantityReceived) *
														numericValue(line.unitPrice),
													2
												)
											: ''
									}
								/>
								<input
									className='h-11 rounded border border-border bg-background px-3 text-sm disabled:opacity-50'
									placeholder={isFixedOrDispensable ? 'N/A (Asset)' : isBatchRequired ? 'Batch number (Req)' : 'Batch number'}
									value={isFixedOrDispensable ? '' : line.batchNumber}
									disabled={isFixedOrDispensable}
									onChange={(e) =>
										updateLine(index, { batchNumber: e.target.value })
									}
								/>
								<label className='grid gap-1 text-xs text-muted-foreground'>
									Expiry date {isFixedOrDispensable ? '(N/A)' : isExpiryRequired ? '(Req)' : '(Opt)'}
									<input
										className='h-11 rounded border border-border bg-background px-3 text-sm text-foreground disabled:opacity-50'
										type='date'
										aria-label='Expiry date, format DD/MM/YYYY'
										title='Expiry date format: DD/MM/YYYY'
										value={isFixedOrDispensable ? '' : line.expiryDate}
										disabled={isFixedOrDispensable}
										onChange={(e) =>
											updateLine(index, { expiryDate: e.target.value })
										}
										required={isExpiryRequired}
									/>
									<span className='date-format-hint'>DD/MM/YYYY</span>
								</label>
								{showLineFundingSource && (
									<select
										className='h-11 min-w-0 rounded border border-border bg-background px-3 text-sm'
										value={line.fundingSourceId}
										onChange={(e) =>
											updateLine(index, { fundingSourceId: e.target.value })
										}
									>
										<option value=''>
											{master?.fundingSources?.length
												? 'Select funding source'
												: 'No funding sources available'}
										</option>
										{master?.fundingSources?.map((source: any) => (
											<option key={source.id} value={source.id}>
												{source.name}
											</option>
										))}
									</select>
								)}
							</div>
							)
						})}
						<div className='flex flex-wrap gap-2'>
							<button
								type='button'
								className='rounded border border-border px-3 py-2 text-sm'
								onClick={addLine}
							>
								Add line
							</button>
							<button
								disabled={
									loadingAction === 'create' ||
									!items.length ||
									!master?.supplierDonors?.length
								}
								className='inline-flex items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60'
							>
								<PackagePlus size={16} />{' '}
								<LoadingInline
									loading={loadingAction === 'create'}
									label='Create Draft GRN'
									loadingLabel='Creating...'
								/>
							</button>
						</div>
					</form>
				)}
				{!canCreateReceipt && canInspectReceipt && (
					<p className='mb-4 rounded border border-border bg-muted px-3 py-2 text-sm text-muted-foreground'>
						Pending GRN inspections are listed below for approval. Draft
						procurement entry is reserved for storekeepers.
					</p>
				)}
				{message && (
					<p className='mb-3 rounded border border-border bg-muted px-3 py-2 text-sm'>
						{message}
					</p>
				)}
				<DataTable
					rows={lines}
					columns={[
						{ key: 'grnNumber', label: 'GRN' },
						{
							key: 'receiptStatus',
							label: 'Status',
							render: (row) => <StatusPill value={row.receiptStatus} />,
						},
						{
							key: 'supplier',
							label: 'Supplier/Donor',
							render: (row) => row.supplierDonor?.name,
						},
						{
							key: 'item',
							label: 'Item',
							render: (row) => row.item?.description,
						},
						{ key: 'quantityReceived', label: 'Received' },
						{
							key: 'totalPrice',
							label: 'Total price',
							render: (row) =>
								formatNumber(
									Number(row.quantityReceived) * Number(row.unitPrice),
									2
								),
						},
						{
							key: 'expiryDate',
							label: 'Expiry date',
							render: (row) =>
								row.expiryDate
									? new Date(row.expiryDate).toLocaleDateString()
									: 'N/A',
						},
						{
							key: 'inspection',
							label: 'Inspection',
							render: (row) => (
								<StatusPill value={row.inspection?.outcome ?? 'PENDING'} />
							),
						},
						{
							key: 'storage',
							label: 'Storage',
							render: (row) => (
								<StatusPill value={row.stockBatches?.[0]?.status ?? 'N/A'} />
							),
						},
						{
							key: 'action',
							label: 'Action',
							render: (row) => (
								<div className='flex flex-wrap gap-2'>
									<button
										disabled={loadingAction === `detail-${row.receiptId}`}
										className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
										title='View GRN'
										onClick={() => openDetail(row.receiptId)}
									>
										<LoadingInline
											loading={loadingAction === `detail-${row.receiptId}`}
											label='View'
											loadingLabel='Opening...'
										/>
									</button>
									<button
										disabled={loadingAction === `m19-${row.receiptId}`}
										className='inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-60'
										title='View / Print Model 19 Receiving Voucher'
										onClick={() => openModel19(row.receiptId)}
									>
										<LoadingInline
											loading={loadingAction === `m19-${row.receiptId}`}
											label='Model 19'
											loadingLabel='Loading...'
										/>
									</button>
									<button
										className='rounded border border-border px-2 py-1 text-xs hover:bg-muted'
										title='Direct Print Model 19'
										onClick={async () => {
											try {
												const r = await request<any>(`/receipts/${row.receiptId}`, token)
												printHtmlDocument(buildModel19PrintDocument(r))
											} catch (err) {
												notify('error', 'Unable to print Model 19')
											}
										}}
									>
										Print
									</button>
									{canCreateReceipt && row.receiptStatus === 'DRAFT' && (
										<button
											disabled={loadingAction === `submit-${row.receiptId}`}
											className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
											onClick={() => submitReceipt(row.receiptId)}
										>
											<LoadingInline
												loading={loadingAction === `submit-${row.receiptId}`}
												label='Submit'
												loadingLabel='Submitting...'
											/>
										</button>
									)}
									{canInspectReceipt &&
										row.receiptStatus !== 'DRAFT' &&
										!row.inspection && (
											<button
												disabled={loadingAction === `accept-${row.id}`}
												className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
												onClick={() => inspectLine(row, 'accept')}
											>
												<LoadingInline
													loading={loadingAction === `accept-${row.id}`}
													label='Accept'
													loadingLabel='Accepting...'
												/>
											</button>
										)}
									{canInspectReceipt &&
										row.receiptStatus !== 'DRAFT' &&
										!row.inspection && (
											<button
												disabled={loadingAction === `partial-${row.id}`}
												className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
												onClick={() => inspectLine(row, 'partial')}
											>
												<LoadingInline
													loading={loadingAction === `partial-${row.id}`}
													label='Partial'
													loadingLabel='Saving...'
												/>
											</button>
										)}
									{canInspectReceipt &&
										row.receiptStatus !== 'DRAFT' &&
										!row.inspection && (
											<button
												disabled={loadingAction === `reject-${row.id}`}
												className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
												onClick={() => inspectLine(row, 'reject')}
											>
												<LoadingInline
													loading={loadingAction === `reject-${row.id}`}
													label='Reject'
													loadingLabel='Rejecting...'
												/>
											</button>
										)}
									{canStoreAccepted &&
										row.inspection &&
										Number(row.inspection.quantityAccepted) > 0 && (
											<button
												className='rounded border border-border px-2 py-1 text-xs'
												title='Assign Storage Location'
												onClick={onOpenStorage}
											>
												Store
											</button>
										)}
								</div>
							),
						},
					]}
				/>
			</Panel>
			{detail && (
				<Modal
					title={`GRN Detail: ${detail.grnNumber}`}
					description='Review receipt source, supplier, inspection outcome, accepted quantities, rejected quantities, and expiry details.'
					onClose={() => setDetail(undefined)}
				>
					<div className='mb-4 flex flex-wrap gap-2'>
						<button
							className='inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary shadow hover:bg-primary/20'
							onClick={() => setModel19Record(detail)}
						>
							<FileDown size={14} /> Model 19 Voucher
						</button>
						<button
							className='inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow hover:opacity-90'
							onClick={() => printHtmlDocument(buildModel19PrintDocument(detail))}
						>
							<Printer size={14} /> Print Model 19
						</button>
						<button
							className='rounded border border-border px-3 py-2 text-xs'
							onClick={() => setDetail(undefined)}
						>
							Close
						</button>
					</div>
					<div className='mb-3 grid gap-3 text-sm md:grid-cols-4'>
						<div>
							<span className='text-muted-foreground'>Source</span>
							<br />
							{detail.sourceType}
						</div>
						<div>
							<span className='text-muted-foreground'>Supplier/Donor</span>
							<br />
							{detail.supplierDonor?.name}
						</div>
						<div>
							<span className='text-muted-foreground'>Status</span>
							<br />
							{detail.status}
						</div>
						<div>
							<span className='text-muted-foreground'>Received</span>
							<br />
							{new Date(detail.receivedAt).toLocaleDateString()}
						</div>
					</div>
					<DataTable
						rows={detail.lines ?? []}
						columns={[
							{
								key: 'item',
								label: 'Item',
								render: (row) => `${row.item?.code} - ${row.item?.description}`,
							},
							{ key: 'quantityReceived', label: 'Received' },
							{ key: 'unitPrice', label: 'Unit price' },
							{
								key: 'totalPrice',
								label: 'Total price',
								render: (row) =>
									formatNumber(
										Number(row.quantityReceived) * Number(row.unitPrice),
										2
									),
							},
							{
								key: 'expiryDate',
								label: 'Expiry date',
								render: (row) =>
									row.expiryDate
										? new Date(row.expiryDate).toLocaleDateString()
										: 'N/A',
							},
							{
								key: 'fundingSource',
								label: 'Funding',
								render: (row) => row.fundingSource?.name,
							},
							{
								key: 'inspection',
								label: 'Inspection',
								render: (row) => row.inspection?.outcome ?? 'PENDING',
							},
							{
								key: 'accepted',
								label: 'Accepted',
								render: (row) => row.inspection?.quantityAccepted ?? 'N/A',
							},
							{
								key: 'rejected',
								label: 'Rejected',
								render: (row) => row.inspection?.quantityRejected ?? 'N/A',
							},
						]}
					/>
				</Modal>
			)}
			{model19Record && (
				<Model19Modal
					record={model19Record}
					onClose={() => setModel19Record(null)}
				/>
			)}
		</section>
	)
}

function Storage({ token }: { token: string }) {
	const [locations, setLocations] = useState<any[]>([])
	const [batches, setBatches] = useState<any[]>([])
	const [balances, setBalances] = useState<any[]>([])
	const [master, setMaster] = useState<any>()
	const [message, setMessage] = useState('')
	const [scanner, setScanner] = useState('')
	const [selectedBatchId, setSelectedBatchId] = useState('')
	const [selectedBalanceId, setSelectedBalanceId] = useState('')
	const [locationForm, setLocationForm] = useState(newStorageLocationForm)
	const [allocation, setAllocation] = useState({
		batchId: '',
		storageLocationId: '',
		quantity: 1,
	})
	const [loadingAction, setLoadingAction] = useState('')
	const [storageModal, setStorageModal] = useState<
		'locations' | 'batches' | 'balances' | 'label' | null
	>(null)
	const load = async () => {
		const [locs, batchRows, balanceRows, masterData] = await Promise.all([
			request<any[]>('/storage-locations', token),
			request<any[]>('/stock-batches', token),
			request<any[]>(
				`/location-balances${scanner ? `?barcode=${encodeURIComponent(scanner)}` : ''}`,
				token
			),
			request<any>('/master-data', token),
		])
		const activeLocations = locs.filter(
			(location) => location.isActive !== false
		)
		setLocations(activeLocations)
		setBatches(batchRows)
		setBalances(balanceRows)
		setMaster(masterData)
		if (scanner && balanceRows[0]) {
			setSelectedBalanceId(balanceRows[0].id)
			setSelectedBatchId(
				balanceRows[0].batchId ?? balanceRows[0].batch?.id ?? ''
			)
			setStorageModal('label')
		}
		setAllocation((current) => ({
			...current,
			batchId:
				current.batchId ||
				batchRows.find((row) => Number(row.remainingQuantity) > 0)?.id ||
				'',
			storageLocationId:
				current.storageLocationId || activeLocations[0]?.id || '',
		}))
	}
	useEffect(() => {
		load().catch((err) =>
			setMessage(errorMessage(err, 'Unable to load storage records.'))
		)
	}, [token, scanner])
	const pendingBatches = batches.filter(
		(batch) => Number(batch.remainingQuantity) > 0
	)
	const selectedBatch = batches.find(
		(batch) => batch.id === (selectedBatchId || allocation.batchId)
	)
	const selectedBatchBalances = balances.filter(
		(balance) =>
			balance.batchId === selectedBatch?.id ||
			balance.batch?.id === selectedBatch?.id
	)
	const selectedLabel =
		balances.find((balance) => balance.id === selectedBalanceId) ??
		selectedBatchBalances[0] ??
		balances[0]
	const selectedBatchRemaining = Number(selectedBatch?.remainingQuantity ?? 0)
	const canAllocate = Boolean(
		allocation.batchId &&
		allocation.storageLocationId &&
		Number(allocation.quantity) > 0
	)
	const selectedBarcodePayload = selectedLabel?.barcodes?.find(
		(code: any) => code.format === 'BARCODE'
	)?.payload
	const selectedQrPayload = selectedLabel?.barcodes?.find(
		(code: any) => code.format === 'QR_CODE'
	)?.payload
	const selectedLabelPayload =
		typeof selectedBarcodePayload === 'object' && selectedBarcodePayload
			? selectedBarcodePayload
			: {
					itemCode: selectedLabel?.item?.code,
					itemName: selectedLabel?.item?.description,
					batchNumber: selectedLabel?.batch?.batchNumber,
					expiryDate: selectedLabel?.batch?.expiryDate,
					store: selectedLabel?.store?.name,
					shelfNumber: selectedLabel?.storageLocation?.shelfNumber,
					binLocation: selectedLabel?.storageLocation?.binNumber,
					quantity: selectedLabel?.quantityOnHand,
				}
	const selectedQrValue =
		typeof selectedQrPayload === 'string'
			? selectedQrPayload
			: buildOfflineQrLabelDataUrl(selectedLabelPayload)
	async function createLocation(event: React.FormEvent) {
		event.preventDefault()
		if (locationForm.gln && !/^\d{13}$/.test(locationForm.gln)) {
			setMessage('GLN must be 13 digits when provided.')
			notify('warning', 'GLN must be 13 digits when provided.')
			return
		}
		const storeId = master?.locations?.[0]?.id
		if (!storeId) {
			setMessage('Create a store before adding shelf/bin locations.')
			notify('warning', 'Create a store before adding shelf/bin locations.')
			return
		}
		setLoadingAction('location')
		try {
			const body = { ...locationForm, storeId }
			await request(
				locationForm.id
					? `/storage-locations/${locationForm.id}`
					: '/storage-locations',
				token,
				{
					method: locationForm.id ? 'PATCH' : 'POST',
					body: JSON.stringify(body),
				}
			)
			setLocationForm(newStorageLocationForm())
			setMessage(
				locationForm.id
					? 'Storage location updated successfully.'
					: 'Storage location created successfully.'
			)
			notify(
				'success',
				locationForm.id
					? 'Storage location updated successfully.'
					: 'Storage location created successfully.'
			)
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to save storage location.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	async function allocate(event: React.FormEvent) {
		event.preventDefault()
		if (!allocation.batchId || !allocation.storageLocationId) {
			setMessage('Select a pending batch and storage location.')
			notify('warning', 'Select a pending batch and storage location.')
			return
		}
		setLoadingAction('allocate')
		try {
			const body: any = {
				storageLocationId: allocation.storageLocationId,
				quantity: Number(allocation.quantity),
			}
			await request(`/stock-batches/${allocation.batchId}/allocate`, token, {
				method: 'POST',
				body: JSON.stringify(body),
			})
			setMessage(
				'Batch allocated successfully. Stock is now available for issuing from that exact bin.'
			)
			notify('success', 'Batch allocated successfully.')
			setAllocation({ batchId: '', storageLocationId: '', quantity: 1 })
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to assign storage location.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	async function setLocationActive(id: string, active: boolean) {
		setLoadingAction(id)
		try {
			await request(`/storage-locations/${id}/active`, token, {
				method: 'PATCH',
				body: JSON.stringify({ active }),
			})
			setMessage(
				active ? 'Storage location activated.' : 'Storage location deactivated.'
			)
			notify(
				'success',
				active ? 'Storage location activated.' : 'Storage location deactivated.'
			)
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to update location status.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	function editLocation(location: any) {
		setLocationForm({
			id: location.id,
			locationCode: location.locationCode ?? '',
			gln: location.gln ?? '',
			roomOrZone: location.roomOrZone ?? '',
			shelfNumber: location.shelfNumber ?? '',
			rackNumber: location.rackNumber ?? '',
			binNumber: location.binNumber ?? '',
			description: location.description ?? '',
		})
	}
	function chooseBatch(batch: any) {
		setSelectedBatchId(batch.id)
		setAllocation((current) => ({
			...current,
			batchId: batch.id,
			quantity: Math.min(
				Number(batch.remainingQuantity),
				Number(current.quantity) || 1
			),
		}))
		setStorageModal(null)
	}
	function openLabel(row: any) {
		setSelectedBalanceId(row.id)
		setSelectedBatchId(row.batchId ?? row.batch?.id ?? '')
		setStorageModal('label')
	}
	return (
		<section className='space-y-5'>
			<Panel title='Create/Edit Shelf/Bin Location'>
				<form
					onSubmit={createLocation}
					className='grid gap-3 rounded border border-border p-3 md:grid-cols-6'
				>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						value={locationForm.locationCode}
						onChange={(e) =>
							setLocationForm({ ...locationForm, locationCode: e.target.value })
						}
						placeholder='Location code'
					/>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						value={locationForm.gln}
						onChange={(e) =>
							setLocationForm({
								...locationForm,
								gln: e.target.value.replace(/\D/g, ''),
							})
						}
						placeholder='GLN (optional)'
					/>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						value={locationForm.roomOrZone}
						onChange={(e) =>
							setLocationForm({ ...locationForm, roomOrZone: e.target.value })
						}
						placeholder='Room/zone'
					/>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						value={locationForm.shelfNumber}
						onChange={(e) =>
							setLocationForm({ ...locationForm, shelfNumber: e.target.value })
						}
						placeholder='Shelf'
					/>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						value={locationForm.rackNumber}
						onChange={(e) =>
							setLocationForm({ ...locationForm, rackNumber: e.target.value })
						}
						placeholder='Rack'
					/>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						value={locationForm.binNumber}
						onChange={(e) =>
							setLocationForm({ ...locationForm, binNumber: e.target.value })
						}
						placeholder='Bin'
					/>
					<button
						disabled={loadingAction === 'location'}
						className='rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60'
					>
						<LoadingInline
							loading={loadingAction === 'location'}
							label='Save location'
							loadingLabel='Saving...'
						/>
					</button>
				</form>
			</Panel>
			<Panel
				title='Storage Lists'
				description='Large lists open only when needed so the workspace stays focused.'
			>
				<div className='grid gap-3 md:grid-cols-3'>
					<button
						className='rounded-lg border border-border bg-background/55 p-4 text-left transition hover:border-primary/45 hover:bg-primary/10'
						onClick={() => setStorageModal('locations')}
					>
						<span className='block text-sm font-semibold'>Store locations</span>
						<span className='mt-1 block text-xs text-muted-foreground'>
							{locations.length} active shelf/bin locations
						</span>
					</button>
					<button
						className='rounded-lg border border-border bg-background/55 p-4 text-left transition hover:border-primary/45 hover:bg-primary/10'
						onClick={() => setStorageModal('batches')}
					>
						<span className='block text-sm font-semibold'>
							Batches awaiting storage
						</span>
						<span className='mt-1 block text-xs text-muted-foreground'>
							{pendingBatches.length} pending allocation
						</span>
					</button>
					<button
						className='rounded-lg border border-border bg-background/55 p-4 text-left transition hover:border-primary/45 hover:bg-primary/10'
						onClick={() => setStorageModal('balances')}
					>
						<span className='block text-sm font-semibold'>
							Location stock balances
						</span>
						<span className='mt-1 block text-xs text-muted-foreground'>
							{balances.length} stored stock records
						</span>
					</button>
				</div>
			</Panel>
			<Panel title='Storage Allocation'>
				<form
					onSubmit={allocate}
					className='grid gap-3 rounded border border-border p-3 md:grid-cols-4'
				>
					<select
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						value={allocation.batchId}
						onChange={(e) => {
							setSelectedBatchId(e.target.value)
							setAllocation({ ...allocation, batchId: e.target.value })
						}}
					>
						<option value=''>
							{pendingBatches.length
								? 'Select accepted batch'
								: 'No accepted batches awaiting storage'}
						</option>
						{pendingBatches.map((batch) => (
							<option key={batch.id} value={batch.id}>
								{batch.item?.description} / {batch.batchNumber ?? 'No batch'} /
								remaining {String(batch.remainingQuantity)}
							</option>
						))}
					</select>
					<select
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						value={allocation.storageLocationId}
						onChange={(e) =>
							setAllocation({
								...allocation,
								storageLocationId: e.target.value,
							})
						}
					>
						<option value=''>
							{locations.length
								? 'Select store/shelf/bin'
								: 'Create a shelf/bin location first'}
						</option>
						{locations.map((location) => (
							<option key={location.id} value={location.id}>
								{location.store?.name} - {location.roomOrZone} - Shelf{' '}
								{location.shelfNumber} - Bin {location.binNumber}
							</option>
						))}
					</select>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						type='number'
						min='1'
						max={selectedBatchRemaining || undefined}
						placeholder='Quantity to place in this bin'
						value={allocation.quantity}
						onChange={(e) =>
							setAllocation({ ...allocation, quantity: Number(e.target.value) })
						}
					/>
					<button
						disabled={loadingAction === 'allocate' || !canAllocate}
						className='primary-action-button'
					>
						<LoadingInline
							loading={loadingAction === 'allocate'}
							label='Assign Storage'
							loadingLabel='Assigning...'
						/>
					</button>
				</form>
				{!pendingBatches.length && (
					<p className='mt-3 rounded border border-border bg-muted px-3 py-2 text-sm text-muted-foreground'>
						No accepted stock is waiting for storage. Submit and accept a GRN
						line first.
					</p>
				)}
				{!locations.length && (
					<p className='mt-3 rounded border border-border bg-muted px-3 py-2 text-sm text-muted-foreground'>
						No active shelf/bin locations exist. Create a storage location above
						before assigning stock.
					</p>
				)}
				{selectedBatch && (
					<div className='mt-3 grid gap-3 rounded border border-border p-3 text-sm md:grid-cols-4'>
						<div>
							<span className='text-muted-foreground'>Selected item</span>
							<br />
							{selectedBatch.item?.description}
						</div>
						<div>
							<span className='text-muted-foreground'>Batch</span>
							<br />
							{selectedBatch.batchNumber ?? 'N/A'}
						</div>
						<div>
							<span className='text-muted-foreground'>Accepted</span>
							<br />
							{String(selectedBatch.totalAcceptedQuantity)}
						</div>
						<div>
							<span className='text-muted-foreground'>Still needs storage</span>
							<br />
							{String(selectedBatch.remainingQuantity)}
						</div>
					</div>
				)}
				{message && (
					<p className='mt-3 rounded border border-border bg-muted px-3 py-2 text-sm'>
						{message}
					</p>
				)}
			</Panel>
			<Panel title='Scanner Search'>
				<input
					className='w-full rounded border border-border bg-background px-3 py-2 text-sm'
					placeholder='Scan or paste barcode/QR value'
					value={scanner}
					onChange={(e) => setScanner(e.target.value)}
				/>
			</Panel>
			{storageModal === 'locations' && (
				<Modal
					title='Store Locations'
					description='Active shelf, rack, and bin locations available for allocation.'
					onClose={() => setStorageModal(null)}
				>
					<DataTable
						rows={locations}
						columns={[
							{ key: 'locationCode', label: 'Code' },
							{ key: 'gln', label: 'GLN', render: (row) => row.gln ?? 'N/A' },
							{
								key: 'store',
								label: 'Store',
								render: (row) => row.store?.name,
							},
							{ key: 'roomOrZone', label: 'Room/zone' },
							{ key: 'shelfNumber', label: 'Shelf' },
							{ key: 'binNumber', label: 'Bin' },
							{ key: 'status', label: 'Status', render: () => 'Active' },
							{
								key: 'actions',
								label: 'Actions',
								render: (row) => (
									<div className='flex flex-wrap gap-2'>
										<button
											className='rounded border border-border px-2 py-1 text-xs'
											onClick={() => {
												editLocation(row)
												setStorageModal(null)
											}}
										>
											Edit
										</button>
										<button
											disabled={loadingAction === row.id}
											className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
											onClick={() => setLocationActive(row.id, false)}
										>
											<LoadingInline
												loading={loadingAction === row.id}
												label='Deactivate'
												loadingLabel='Saving...'
											/>
										</button>
									</div>
								),
							},
						]}
					/>
				</Modal>
			)}
			{storageModal === 'batches' && (
				<Modal
					title='Accepted Batches Awaiting Storage'
					description='Accepted stock that still needs assignment to a store, shelf, and bin.'
					onClose={() => setStorageModal(null)}
				>
					<DataTable
						rows={pendingBatches}
						empty='No accepted batches are waiting for storage allocation.'
						columns={[
							{
								key: 'item',
								label: 'Item',
								render: (row) =>
									`${row.item?.code ?? ''} ${row.item?.description ?? ''}`,
							},
							{
								key: 'batchNumber',
								label: 'Batch',
								render: (row) => row.batchNumber ?? 'N/A',
							},
							{ key: 'totalAcceptedQuantity', label: 'Accepted' },
							{ key: 'remainingQuantity', label: 'Unallocated' },
							{
								key: 'actions',
								label: 'Action',
								render: (row) => (
									<button
										className='rounded border border-border px-2 py-1 text-xs'
										onClick={() => chooseBatch(row)}
									>
										Assign Storage Location
									</button>
								),
							},
						]}
					/>
				</Modal>
			)}
			{storageModal === 'balances' && (
				<Modal
					title='Location Stock Balances'
					description='Current stock by item, batch, store, shelf, and bin.'
					onClose={() => setStorageModal(null)}
				>
					<DataTable
						rows={balances}
						columns={[
							{
								key: 'item',
								label: 'Item',
								render: (row) => row.item?.description,
							},
							{
								key: 'batch',
								label: 'Batch',
								render: (row) => row.batch?.batchNumber ?? 'N/A',
							},
							{
								key: 'store',
								label: 'Store',
								render: (row) => row.store?.name,
							},
							{
								key: 'location',
								label: 'Store -> Shelf -> Bin',
								render: (row) =>
									`${row.storageLocation?.roomOrZone ?? row.store?.name} -> Shelf ${row.storageLocation?.shelfNumber} -> Bin ${row.storageLocation?.binNumber}`,
							},
							{ key: 'quantityAvailable', label: 'Available' },
							{
								key: 'barcode',
								label: 'Barcode/QR',
								render: (row) => row.barcodes?.[0]?.value ?? 'N/A',
							},
							{
								key: 'actions',
								label: 'Actions',
								render: (row) => (
									<button
										className='rounded border border-border px-2 py-1 text-xs'
										onClick={() => openLabel(row)}
									>
										Label
									</button>
								),
							},
						]}
					/>
				</Modal>
			)}
			{storageModal === 'label' && selectedLabel && (
				<Modal
					title='Barcode/QR Label'
					description='Printable stock label for the selected item, batch, shelf, and bin.'
					onClose={() => setStorageModal(null)}
				>
					<div className='inline-block rounded border border-border bg-white p-4 text-black print:shadow-none'>
						<p className='font-semibold'>
							{selectedLabel.item?.code} - {selectedLabel.item?.description}
						</p>
						<p className='text-sm'>
							GTIN: {selectedLabelPayload?.gtin ?? 'N/A'}
						</p>
						<p className='text-sm'>
							Batch: {selectedLabel.batch?.batchNumber ?? 'N/A'}
						</p>
						<p className='text-sm'>
							Lot:{' '}
							{selectedLabelPayload?.lotNumber ??
								selectedLabel.batch?.batchNumber ??
								'N/A'}
						</p>
						<p className='text-sm'>Store: {selectedLabel.store?.name}</p>
						<p className='text-sm'>GLN: {selectedLabelPayload?.gln ?? 'N/A'}</p>
						<p className='text-sm'>
							Shelf: {selectedLabel.storageLocation?.shelfNumber} Bin:{' '}
							{selectedLabel.storageLocation?.binNumber}
						</p>
						<p className='text-sm'>
							Quantity: {String(selectedLabel.quantityOnHand)}
						</p>
						{selectedLabelPayload?.gs1?.elementString && (
							<p className='mt-2 max-w-xs break-all text-xs'>
								GS1: {selectedLabelPayload.gs1.elementString}
							</p>
						)}
						{selectedLabel.barcodes?.find(
							(code: any) => code.format === 'BARCODE'
						)?.uploadedFileId && (
							<img
								className='mt-3 h-16 max-w-xs object-contain'
								src={fileUrl(
									selectedLabel.barcodes.find(
										(code: any) => code.format === 'BARCODE'
									)?.uploadedFileId
								)}
								alt='Uploaded barcode'
							/>
						)}
						{selectedLabel.barcodes?.find(
							(code: any) => code.format === 'QR_CODE'
						)?.uploadedFileId && (
							<img
								className='mt-3 h-24 max-w-xs object-contain'
								src={fileUrl(
									selectedLabel.barcodes.find(
										(code: any) => code.format === 'QR_CODE'
									)?.uploadedFileId
								)}
								alt='Uploaded QR code'
							/>
						)}
						<QRCodeSVG
							className='mt-3'
							value={selectedQrValue}
							size={220}
							level='L'
							marginSize={4}
							boostLevel={false}
						/>
						<p className='mt-2 max-w-xs break-all text-xs'>
							{
								selectedLabel.barcodes?.find(
									(code: any) => code.format === 'QR_CODE'
								)?.value
							}
						</p>
					</div>
					<button
						className='ml-3 rounded border border-border px-3 py-2 text-sm'
						onClick={() => printCurrentView()}
					>
						Print label
					</button>
				</Modal>
			)}
		</section>
	)
}

function StockLedger({ token }: { token: string }) {
	const [rows, setRows] = useState<any[]>([])
	useEffect(() => {
		request<any[]>('/ledger/movements', token).then(setRows)
	}, [token])
	return (
		<Panel
			title='Stock Ledger'
			description='Stock rotation supports FIFO by receipt order and FEFO by earliest valid expiry date. Empty expiry dates are shown as N/A.'
		>
			<DataTable
				rows={rows}
				columns={[
					{
						key: 'postedAt',
						label: 'Date',
						render: (row) => new Date(row.postedAt).toLocaleString(),
					},
					{ key: 'type', label: 'Type' },
					{
						key: 'item',
						label: 'Item',
						render: (row) => row.item?.description,
					},
					{
						key: 'batch',
						label: 'Batch',
						render: (row) => row.batch?.batchNumber ?? row.batchNumber ?? 'N/A',
					},
					{
						key: 'expiryDate',
						label: 'Expiry date',
						render: (row) =>
							row.batch?.expiryDate || row.expiryDate
								? new Date(
										row.batch?.expiryDate ?? row.expiryDate
									).toLocaleDateString()
								: 'N/A',
					},
					{ key: 'quantity', label: 'Qty' },
					{
						key: 'location',
						label: 'Store -> Shelf -> Bin',
						render: (row) =>
							row.storageLocation
								? `${row.storageLocation.store?.name} -> Shelf ${row.storageLocation.shelfNumber} -> Bin ${row.storageLocation.binNumber}`
								: `${row.shelfCode ?? 'N/A'} -> ${row.binCode ?? 'N/A'}`,
					},
					{ key: 'sourceEntity', label: 'Reference' },
				]}
			/>
		</Panel>
	)
}

function Issuance({ token, user }: { token: string; user: User }) {
	const [issues, setIssues] = useState<any[]>([])
	const [master, setMaster] = useState<any>()
	const [items, setItems] = useState<any[]>([])
	const [message, setMessage] = useState('')
	const [form, setForm] = useState({
		itemId: '',
		departmentName: user.department?.name ?? '',
		recipientName: user.fullName ?? '',
		purpose: '',
		quantity: 1,
	})
	const [pickLists, setPickLists] = useState<Record<string, any[]>>({})
	const [loadingAction, setLoadingAction] = useState('')
	const [model22Record, setModel22Record] = useState<any | null>(null)
	const [returnModalIssue, setReturnModalIssue] = useState<any | null>(null)

	const canApprove = user.permissions.includes(permissions.ISSUE_APPROVE)
	const canRequest = user.permissions.includes(permissions.REQUEST_CREATE)
	const canIssue = user.permissions.includes(permissions.ISSUE_EXECUTE)
	const canReturn = user.permissions.includes(permissions.RETURN_CREATE)

	const load = async () => {
		const [issueRows, masterData, itemData] = await Promise.all([
			request<any[]>('/issues', token),
			request<any>('/master-data', token),
			request<any>('/items?active=true&pageSize=1000', token),
		])
		setIssues(issueRows)
		setMaster(masterData)
		setItems(itemData.items ?? [])
		setForm((current) => ({
			...current,
			itemId: current.itemId || itemData.items?.[0]?.id || '',
			departmentName:
				current.departmentName ||
				user.department?.name ||
				masterData.departments?.[0]?.name ||
				'',
			recipientName: current.recipientName || user.fullName || '',
		}))
	}
	useEffect(() => {
		load().catch((err) =>
			setMessage(errorMessage(err, 'Unable to load issue requests.'))
		)
	}, [token])

	async function createIssue(event: React.FormEvent) {
		event.preventDefault()
		const itemId = form.itemId
		const department = master?.departments?.find(
			(row: any) =>
				row.name.toLowerCase() === form.departmentName.trim().toLowerCase()
		)
		const departmentId = department?.id
		if (!itemId || !departmentId) {
			setMessage('Select a valid requesting department.')
			notify('warning', 'Select a valid requesting department.')
			return
		}
		if (!form.recipientName?.trim()) {
			setMessage('Recipient Name (the person receiving/certifying items) is required.')
			notify('warning', 'Recipient Name is required for Model 22 certification.')
			return
		}
		setLoadingAction('create')
		try {
			await request('/issues', token, {
				method: 'POST',
				body: JSON.stringify({
					departmentId,
					recipientName: form.recipientName.trim(),
					purpose: form.purpose || 'Operational request',
					lines: [{ itemId, quantity: Number(form.quantity) }],
				}),
			})
			setForm({
				itemId,
				departmentName: department.name,
				recipientName: user.fullName ?? '',
				purpose: '',
				quantity: 1,
			})
			setMessage('Request submitted for approval.')
			notify('success', 'Request submitted for approval.')
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to submit request.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	async function action(id: string, endpoint: string, success: string) {
		setLoadingAction(`${id}-${endpoint}`)
		try {
			const issueRows = pickLists[id]
				?.map((row: any) => ({
					itemId: row.item?.id,
					batchId: row.batchId,
					storageLocationId: row.storageLocationId,
					quantity: Number(row.quantityToIssue ?? row.quantity),
				}))
				.filter(
					(row: any) =>
						row.itemId &&
						row.batchId &&
						row.storageLocationId &&
						row.quantity > 0
				)
			await request(`/issues/${id}/${endpoint}`, token, {
				method: 'POST',
				body: JSON.stringify(
					endpoint === 'issue' && issueRows?.length
						? { lines: issueRows }
						: { reason: success, notes: success }
				),
			})
			setMessage(success)
			notify(endpoint === 'reject' ? 'warning' : 'success', success)
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to complete issue action.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	async function openPickList(id: string) {
		setLoadingAction(`${id}-pick`)
		try {
			const result = await request<any>(`/issues/${id}/pick-list`, token)
			const rows = (result.picks ?? []).flatMap((pick: any) =>
				(pick.allocations ?? []).map((allocation: any) => ({
					...allocation,
					item: pick.item,
					quantityRequested: pick.quantityRequested,
					availableQuantity:
						allocation.availableQuantity ??
						allocation.quantityAvailable ??
						allocation.quantity,
					quantityToIssue: allocation.quantityToIssue ?? allocation.quantity,
				}))
			)
			setPickLists((current) => ({ ...current, [id]: rows }))
			notify('success', 'Pick list loaded from available assigned stock.')
		} catch (err) {
			const message = errorMessage(err, 'Unable to load pick list.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	return (
		<Panel
			title='Stock Issuance'
			description='Official stock issuance with Model 22 issue voucher generation and return tracking.'
		>
			{canRequest && (
				<form
					onSubmit={createIssue}
					className='mb-4 grid gap-3 rounded border border-border p-3 md:grid-cols-6'
				>
					<SearchableSelect
						className='py-2'
						value={form.itemId}
						onChange={(value) => setForm({ ...form, itemId: value })}
						options={items.map((item) => ({
							value: item.id,
							label: `${item.code} - ${item.description}`,
						}))}
						placeholder='Select requested item'
					/>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						list='issue-departments'
						placeholder='Requesting department'
						value={form.departmentName}
						onChange={(e) =>
							setForm({ ...form, departmentName: e.target.value })
						}
						required
					/>
					<datalist id='issue-departments'>
						{master?.departments?.map((department: any) => (
							<option key={department.id} value={department.name} />
						))}
					</datalist>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						placeholder='Recipient Name (የተቀባይ ስም) *'
						value={form.recipientName}
						onChange={(e) =>
							setForm({ ...form, recipientName: e.target.value })
						}
						required
						title='Person receiving the items who will sign Model 22'
					/>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						placeholder='Purpose'
						value={form.purpose}
						onChange={(e) => setForm({ ...form, purpose: e.target.value })}
					/>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						type='number'
						min='1'
						placeholder='Quantity requested'
						value={form.quantity}
						onChange={(e) =>
							setForm({ ...form, quantity: Number(e.target.value) })
						}
					/>
					<button
						disabled={loadingAction === 'create'}
						className='inline-flex items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 md:col-span-6 lg:col-span-1'
					>
						<PackageCheck size={16} />{' '}
						<LoadingInline
							loading={loadingAction === 'create'}
							label='Submit request'
							loadingLabel='Submitting...'
						/>
					</button>
				</form>
			)}
			{message && (
				<p className='mb-3 rounded border border-border bg-muted px-3 py-2 text-sm'>
					{message}
				</p>
			)}
			<DataTable
				rows={issues}
				columns={[
					{ key: 'requestNumber', label: 'Request' },
					{
						key: 'department',
						label: 'Department',
						render: (row) => row.department?.name,
					},
					{
						key: 'recipientName',
						label: 'Recipient',
						render: (row) => row.recipientName ?? row.requestedBy?.fullName ?? 'N/A',
					},
					{
						key: 'items',
						label: 'Items',
						render: (row) =>
							row.lines
								?.map(
									(line: any) => `${line.item?.description} (${line.quantity})`
								)
								.join(', '),
					},
					{ key: 'status', label: 'Status' },
					{
						key: 'voucher',
						label: 'Voucher (Model 22)',
						render: (row) => row.voucher?.voucherNumber ?? 'N/A',
					},
					{
						key: 'actions',
						label: 'Actions',
						render: (row) => (
							<div className='flex flex-wrap gap-1.5'>
								<button
									disabled={loadingAction === `${row.id}-pick`}
									className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
									onClick={() => openPickList(row.id)}
								>
									<LoadingInline
										loading={loadingAction === `${row.id}-pick`}
										label='Pick list'
										loadingLabel='Loading...'
									/>
								</button>
								{canApprove &&
									(row.status === 'SUBMITTED' ||
										row.status === 'PENDING_APPROVAL') && (
										<button
											disabled={loadingAction === `${row.id}-approve`}
											className='rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400 disabled:opacity-60'
											onClick={() =>
												action(
													row.id,
													'approve',
													'Request approved. Pending store issue voucher.'
												)
											}
										>
											<LoadingInline
												loading={loadingAction === `${row.id}-approve`}
												label='Approve'
												loadingLabel='Approving...'
											/>
										</button>
									)}
								{canApprove &&
									(row.status === 'SUBMITTED' ||
										row.status === 'PENDING_APPROVAL') && (
										<button
											disabled={loadingAction === `${row.id}-reject`}
											className='rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-400 disabled:opacity-60'
											onClick={() =>
												action(row.id, 'reject', 'Request rejected.')
											}
										>
											<LoadingInline
												loading={loadingAction === `${row.id}-reject`}
												label='Reject'
												loadingLabel='Rejecting...'
											/>
										</button>
									)}
								{canIssue && row.status === 'PENDING_ISSUE' && (
									<button
										disabled={loadingAction === `${row.id}-issue`}
										className='rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-60'
										onClick={() =>
											action(
												row.id,
												'issue',
												'Store Issue Voucher completed and stock deducted.'
											)
										}
									>
										<LoadingInline
											loading={loadingAction === `${row.id}-issue`}
											label='Issue Voucher'
											loadingLabel='Issuing...'
										/>
									</button>
								)}
								{row.voucher && (
									<>
										<button
											className='inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20'
											onClick={() => setModel22Record(row)}
										>
											<FileDown size={12} /> Model 22
										</button>
										<button
											className='rounded border border-border px-2 py-1 text-xs hover:bg-muted'
											onClick={() =>
												printHtmlDocument(buildModel22PrintDocument(row))
											}
										>
											Print
										</button>
									</>
								)}
								{canReturn &&
									(row.status === 'ISSUED' ||
										row.status === 'PARTIALLY_ISSUED' ||
										row.status === 'CLOSED') && (
										<button
											className='inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20'
											onClick={() => setReturnModalIssue(row)}
										>
											<Recycle size={12} /> Return Item
										</button>
									)}
								{canRequest &&
									(row.status === 'ISSUED' ||
										row.status === 'PARTIALLY_ISSUED') && (
										<button
											disabled={loadingAction === `${row.id}-receive`}
											className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
											onClick={() =>
												action(
													row.id,
													'receive',
													'Department receipt acknowledged.'
												)
											}
										>
											<LoadingInline
												loading={loadingAction === `${row.id}-receive`}
												label='Receive'
												loadingLabel='Receiving...'
											/>
										</button>
									)}
								{row.status === 'CLOSED' &&
									(row.materialReceipt?.receiptNumber ?? 'Closed')}
							</div>
						),
					},
				]}
			/>
			{Object.entries(pickLists).map(([issueId, rows]) => {
				const issue = issues.find((row) => row.id === issueId)
				return (
					<div key={issueId} className='mt-4 rounded border border-border p-3'>
						<div className='mb-3 flex items-center justify-between gap-3'>
							<h3 className='text-sm font-semibold'>
								Pick list: {issue?.requestNumber ?? issueId}
							</h3>
							<button
								className='rounded border border-border px-2 py-1 text-xs'
								onClick={() =>
									setPickLists((current) => {
										const next = { ...current }
										delete next[issueId]
										return next
									})
								}
							>
								Close
							</button>
						</div>
						<DataTable
							rows={rows}
							empty='No stock is available for this request.'
							columns={[
								{
									key: 'item',
									label: 'Item',
									render: (row) => row.item?.description,
								},
								{ key: 'batchNumber', label: 'Batch' },
								{ key: 'storeName', label: 'Store' },
								{ key: 'shelfCode', label: 'Shelf' },
								{ key: 'binCode', label: 'Bin' },
								{ key: 'availableQuantity', label: 'Available' },
								{ key: 'quantityToIssue', label: 'To issue' },
							]}
						/>
					</div>
				)
			})}
			{model22Record && (
				<Model22Modal
					record={model22Record}
					onClose={() => setModel22Record(null)}
				/>
			)}
			{returnModalIssue && (
				<ReturnItemModal
					token={token}
					user={user}
					issue={returnModalIssue}
					onClose={() => {
						setReturnModalIssue(null)
						void load()
					}}
				/>
			)}
		</Panel>
	)
}

function Model22Modal({
	record,
	onClose,
}: {
	record: SivPrintRecord
	onClose: () => void
}) {
	const html = useMemo(() => buildModel22PrintDocument(record), [record])
	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
			<div className='flex max-h-[96vh] w-full max-w-5xl flex-col rounded-xl border border-border bg-background shadow-2xl'>
				<div className='flex items-center justify-between border-b border-border px-5 py-3.5'>
					<div className='flex items-center gap-3'>
						<span className='grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary'>
							<FileDown size={18} />
						</span>
						<div>
							<h2 className='text-base font-semibold'>
								Model 22 — Receipt for Articles of Property Issued
							</h2>
							<p className='text-xs text-muted-foreground'>
								{record.voucher?.voucherNumber ?? record.requestNumber ?? 'SIV'} &bull; Official Amharic / English Standard Voucher
							</p>
						</div>
					</div>
					<div className='flex items-center gap-2'>
						<button
							className='inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:opacity-90'
							onClick={() => printHtmlDocument(html)}
						>
							<Printer size={14} /> Print / Export PDF
						</button>
						<button
							className='rounded-lg border border-border p-1.5 hover:bg-muted'
							onClick={onClose}
						>
							<X size={18} />
						</button>
					</div>
				</div>
				<div className='flex-1 overflow-auto bg-muted/30 p-4'>
					<div className='mx-auto flex justify-center'>
						<iframe
							title='Model 22 Voucher Preview'
							srcDoc={html}
							className='h-[880px] w-[820px] rounded border border-border bg-white shadow-xl'
						/>
					</div>
				</div>
			</div>
		</div>
	)
}

function Model19Modal({
	record,
	onClose,
}: {
	record: GrnPrintRecord
	onClose: () => void
}) {
	const html = useMemo(() => buildModel19PrintDocument(record), [record])
	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
			<div className='flex max-h-[96vh] w-full max-w-5xl flex-col rounded-xl border border-border bg-background shadow-2xl'>
				<div className='flex items-center justify-between border-b border-border px-5 py-3.5'>
					<div className='flex items-center gap-3'>
						<span className='grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary'>
							<FileDown size={18} />
						</span>
						<div>
							<h2 className='text-base font-semibold'>
								Model 19 — Receipt for Articles or Property Received (የዕቃ ወይም የንብረት ገቢ ደረሰኝ)
							</h2>
							<p className='text-xs text-muted-foreground'>
								{record.grnNumber ?? 'GRN'} &bull; Official Amharic / English Standard Receiving Voucher
							</p>
						</div>
					</div>
					<div className='flex items-center gap-2'>
						<button
							className='inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:opacity-90'
							onClick={() => printHtmlDocument(html)}
						>
							<Printer size={14} /> Print / Export PDF
						</button>
						<button
							className='rounded-lg border border-border p-1.5 hover:bg-muted'
							onClick={onClose}
						>
							<X size={18} />
						</button>
					</div>
				</div>
				<div className='flex-1 overflow-auto bg-muted/30 p-4'>
					<div className='mx-auto flex justify-center'>
						<iframe
							title='Model 19 Receiving Voucher Preview'
							srcDoc={html}
							className='h-[880px] w-[820px] rounded border border-border bg-white shadow-xl'
						/>
					</div>
				</div>
			</div>
		</div>
	)
}

function ReturnItemModal({
	token,
	user,
	issue,
	onClose,
}: {
	token: string
	user: User
	issue?: any
	onClose: () => void
}) {
	const [vouchers, setVouchers] = useState<any[]>([])
	const [selectedIssueId, setSelectedIssueId] = useState(issue?.id ?? '')
	const [selectedItemId, setSelectedItemId] = useState(issue?.lines?.[0]?.itemId ?? '')
	const [quantity, setQuantity] = useState(1)
	const [reason, setReason] = useState('Excess stock returned')
	const [conditionNotes, setConditionNotes] = useState('')
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')

	useEffect(() => {
		if (!issue) {
			request<any[]>('/issues', token).then((rows) => {
				const issuedRows = rows.filter((r) => r.voucher && (r.status === 'ISSUED' || r.status === 'PARTIALLY_ISSUED' || r.status === 'CLOSED'))
				setVouchers(issuedRows)
				if (issuedRows.length > 0) {
					setSelectedIssueId(issuedRows[0].id)
					setSelectedItemId(issuedRows[0].lines?.[0]?.itemId ?? '')
				}
			}).catch(() => undefined)
		}
	}, [issue, token])

	const currentIssue = issue ?? vouchers.find((v) => v.id === selectedIssueId)
	const lineItems = currentIssue?.lines ?? []
	const activeLine = lineItems.find((l: any) => l.itemId === selectedItemId) ?? lineItems[0]

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!selectedItemId || quantity <= 0) {
			setMessage('Please select a valid item and quantity.')
			return
		}
		setLoading(true)
		setMessage('')
		try {
			await request('/returns', token, {
				method: 'POST',
				body: JSON.stringify({
					voucherId: currentIssue?.voucher?.id,
					issueRequestId: currentIssue?.id,
					departmentId: currentIssue?.departmentId ?? user.department?.id,
					reason,
					conditionNotes,
					lines: [
						{
							itemId: activeLine?.itemId ?? selectedItemId,
							quantity: Number(quantity),
							batchId: activeLine?.batchId,
							batchNumber: activeLine?.batchNumber,
							conditionNotes,
						},
					],
				}),
			})
			notify('success', 'Item return submitted. Placed in Returned Items holding location (RET-HOLDING-01) pending inspection.')
			onClose()
		} catch (err) {
			const msg = errorMessage(err, 'Unable to create item return.')
			setMessage(msg)
			notify('error', msg)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
			<div className='w-full max-w-xl rounded-xl border border-border bg-background p-6 shadow-2xl'>
				<div className='mb-4 flex items-center justify-between'>
					<div className='flex items-center gap-3'>
						<span className='grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary'>
							<Recycle size={20} />
						</span>
						<div>
							<h3 className='text-base font-semibold'>Initiate Item Return</h3>
							<p className='text-xs text-muted-foreground'>
								Return previously issued items to holding storage for inspection
							</p>
						</div>
					</div>
					<button className='rounded-lg border border-border p-1.5 hover:bg-muted' onClick={onClose}>
						<X size={18} />
					</button>
				</div>
				<form onSubmit={handleSubmit} className='space-y-4'>
					{!issue && (
						<div>
							<label className='block text-xs font-semibold text-muted-foreground mb-1'>Referenced Issue Request / SIV</label>
							<select
								className='w-full rounded border border-border bg-background px-3 py-2 text-sm'
								value={selectedIssueId}
								onChange={(e) => {
									const found = vouchers.find((v) => v.id === e.target.value)
									setSelectedIssueId(e.target.value)
									setSelectedItemId(found?.lines?.[0]?.itemId ?? '')
								}}
							>
								{vouchers.map((v) => (
									<option key={v.id} value={v.id}>
										{v.requestNumber} ({v.voucher?.voucherNumber ?? 'SIV'}) &bull; {v.department?.name}
									</option>
								))}
							</select>
						</div>
					)}
					{currentIssue && (
						<div className='rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1'>
							<div><span className='font-semibold'>Request:</span> {currentIssue.requestNumber}</div>
							<div><span className='font-semibold'>SIV Voucher:</span> {currentIssue.voucher?.voucherNumber ?? 'N/A'}</div>
							<div><span className='font-semibold'>Department:</span> {currentIssue.department?.name}</div>
						</div>
					)}
					<div>
						<label className='block text-xs font-semibold text-muted-foreground mb-1'>Item to Return</label>
						<select
							className='w-full rounded border border-border bg-background px-3 py-2 text-sm'
							value={selectedItemId}
							onChange={(e) => setSelectedItemId(e.target.value)}
							required
						>
							{lineItems.map((line: any) => (
								<option key={line.id ?? line.itemId} value={line.itemId}>
									{line.item?.description ?? line.item?.code} (Issued: {line.issuedQuantity ?? line.quantity})
								</option>
							))}
						</select>
					</div>
					<div className='grid grid-cols-2 gap-3'>
						<div>
							<label className='block text-xs font-semibold text-muted-foreground mb-1'>Return Quantity</label>
							<input
								type='number'
								min='1'
								max={activeLine?.issuedQuantity ?? activeLine?.quantity ?? 10000}
								className='w-full rounded border border-border bg-background px-3 py-2 text-sm'
								value={quantity}
								onChange={(e) => setQuantity(Number(e.target.value))}
								required
							/>
						</div>
						<div>
							<label className='block text-xs font-semibold text-muted-foreground mb-1'>Return Reason</label>
							<select
								className='w-full rounded border border-border bg-background px-3 py-2 text-sm'
								value={reason}
								onChange={(e) => setReason(e.target.value)}
							>
								<option value='Excess stock returned'>Excess stock returned</option>
								<option value='Defective / Damaged'>Defective / Damaged</option>
								<option value='Wrong specification'>Wrong specification</option>
								<option value='Project completed'>Project completed</option>
								<option value='Order cancelled'>Order cancelled</option>
								<option value='Other'>Other</option>
							</select>
						</div>
					</div>
					<div>
						<label className='block text-xs font-semibold text-muted-foreground mb-1'>Condition Notes & Physical Appearance</label>
						<textarea
							rows={2}
							className='w-full rounded border border-border bg-background px-3 py-2 text-sm'
							placeholder='e.g. Unopened box, minor package wear, item tested operational...'
							value={conditionNotes}
							onChange={(e) => setConditionNotes(e.target.value)}
						/>
					</div>
					<div className='rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300'>
						<strong>Storage Allocation:</strong> Returned items will be deposited into the dedicated storage location: <strong>Returned Items Location (RET-HOLDING-01)</strong> under <strong>Pending Inspection</strong> status until cleared by an Inspector.
					</div>
					{message && <p className='text-xs text-danger'>{message}</p>}
					<div className='flex justify-end gap-2 pt-2'>
						<button type='button' className='rounded border border-border px-3 py-2 text-sm' onClick={onClose}>
							Cancel
						</button>
						<button
							disabled={loading}
							type='submit'
							className='inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60'
						>
							<LoadingInline loading={loading} label='Submit Return' loadingLabel='Submitting...' />
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

function InspectReturnModal({
	token,
	returnRecord,
	onClose,
}: {
	token: string
	returnRecord: any
	onClose: () => void
}) {
	const [outcome, setOutcome] = useState<'APPROVED' | 'REJECTED' | 'PARTIALLY_APPROVED'>('APPROVED')
	const [qualityStatus, setQualityStatus] = useState<'PASS' | 'FAIL'>('PASS')
	const [targetStoreId, setTargetStoreId] = useState('')
	const [targetStorageLocationId, setTargetStorageLocationId] = useState('')
	const [rejectionReason, setRejectionReason] = useState('Damaged / Unusable')
	const [remarks, setRemarks] = useState('')
	const [stores, setStores] = useState<any[]>([])
	const [storageLocations, setStorageLocations] = useState<any[]>([])
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')

	useEffect(() => {
		request<any>('/master-data', token).then((data) => {
			const activeStores = data.storeLocations ?? []
			setStores(activeStores)
			const mainStore = activeStores.find((s: any) => s.code === 'MAIN') ?? activeStores[0]
			if (mainStore) {
				setTargetStoreId(mainStore.id)
			}
			setStorageLocations(data.storageLocations ?? [])
			const mainStorageLoc = (data.storageLocations ?? []).find((l: any) => l.storeId === mainStore?.id && l.isActive)
			if (mainStorageLoc) {
				setTargetStorageLocationId(mainStorageLoc.id)
			}
		}).catch(() => undefined)
	}, [token])

	const filteredStorageLocations = storageLocations.filter((l) => l.storeId === targetStoreId && l.locationCode !== 'RET-HOLDING-01')

	async function handleInspect(e: React.FormEvent) {
		e.preventDefault()
		setLoading(true)
		setMessage('')
		try {
			await request(`/returns/${returnRecord.id}/inspect`, token, {
				method: 'POST',
				body: JSON.stringify({
					outcome,
					qualityStatus: outcome === 'APPROVED' ? 'PASS' : outcome === 'REJECTED' ? 'FAIL' : qualityStatus,
					rejectionReason: outcome !== 'APPROVED' ? rejectionReason : undefined,
					remarks,
					targetStoreId: outcome !== 'REJECTED' ? targetStoreId : undefined,
					targetStorageLocationId: outcome !== 'REJECTED' ? targetStorageLocationId : undefined,
				}),
			})
			notify('success', `Inspection recorded: ${outcome === 'APPROVED' ? 'Restocked to Store' : outcome === 'REJECTED' ? 'Quarantined for Disposal' : 'Partially Cleared'}.`)
			onClose()
		} catch (err) {
			const msg = errorMessage(err, 'Unable to complete return inspection.')
			setMessage(msg)
			notify('error', msg)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
			<div className='w-full max-w-xl rounded-xl border border-border bg-background p-6 shadow-2xl'>
				<div className='mb-4 flex items-center justify-between'>
					<div className='flex items-center gap-3'>
						<span className='grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary'>
							<PackageSearch size={20} />
						</span>
						<div>
							<h3 className='text-base font-semibold'>Inspect Returned Item</h3>
							<p className='text-xs text-muted-foreground'>
								Inspection voucher {returnRecord.returnNumber} &bull; Condition verification & restocking decision
							</p>
						</div>
					</div>
					<button className='rounded-lg border border-border p-1.5 hover:bg-muted' onClick={onClose}>
						<X size={18} />
					</button>
				</div>
				<form onSubmit={handleInspect} className='space-y-4'>
					<div className='rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1.5'>
						<div><span className='font-semibold'>Return №:</span> {returnRecord.returnNumber}</div>
						<div><span className='font-semibold'>Department:</span> {returnRecord.department?.name}</div>
						<div><span className='font-semibold'>Return Reason:</span> {returnRecord.reason}</div>
						<div><span className='font-semibold'>Condition Notes:</span> {returnRecord.conditionNotes || 'None'}</div>
						<div>
							<span className='font-semibold'>Items:</span>{' '}
							{returnRecord.lines?.map((l: any) => `${l.item?.description} (${l.quantityReturned} units)`).join(', ')}
						</div>
					</div>
					<div>
						<label className='block text-xs font-semibold text-muted-foreground mb-1.5'>Inspection Decision</label>
						<div className='grid grid-cols-3 gap-2'>
							<button
								type='button'
								className={cn(
									'rounded-lg border p-2.5 text-center text-xs font-semibold transition',
									outcome === 'APPROVED'
										? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-sm'
										: 'border-border bg-background hover:bg-muted'
								)}
								onClick={() => { setOutcome('APPROVED'); setQualityStatus('PASS'); }}
							>
								✓ Pass & Restock
							</button>
							<button
								type='button'
								className={cn(
									'rounded-lg border p-2.5 text-center text-xs font-semibold transition',
									outcome === 'REJECTED'
										? 'border-rose-500 bg-rose-500/15 text-rose-400 shadow-sm'
										: 'border-border bg-background hover:bg-muted'
								)}
								onClick={() => { setOutcome('REJECTED'); setQualityStatus('FAIL'); }}
							>
								✕ Reject & Quarantine
							</button>
							<button
								type='button'
								className={cn(
									'rounded-lg border p-2.5 text-center text-xs font-semibold transition',
									outcome === 'PARTIALLY_APPROVED'
										? 'border-amber-500 bg-amber-500/15 text-amber-400 shadow-sm'
										: 'border-border bg-background hover:bg-muted'
								)}
								onClick={() => setOutcome('PARTIALLY_APPROVED')}
							>
								⚠ Partial Pass
							</button>
						</div>
					</div>
					{outcome !== 'REJECTED' && (
						<div className='grid grid-cols-2 gap-3'>
							<div>
								<label className='block text-xs font-semibold text-muted-foreground mb-1'>Restock Destination Store</label>
								<select
									className='w-full rounded border border-border bg-background px-3 py-2 text-sm'
									value={targetStoreId}
									onChange={(e) => {
										setTargetStoreId(e.target.value)
										const loc = storageLocations.find((l) => l.storeId === e.target.value && l.locationCode !== 'RET-HOLDING-01')
										if (loc) setTargetStorageLocationId(loc.id)
									}}
									required
								>
									{stores.filter((s) => s.code !== 'RETURNED').map((s) => (
										<option key={s.id} value={s.id}>{s.name} ({s.code})</option>
									))}
								</select>
							</div>
							<div>
								<label className='block text-xs font-semibold text-muted-foreground mb-1'>Target Shelf / Bin Location</label>
								<select
									className='w-full rounded border border-border bg-background px-3 py-2 text-sm'
									value={targetStorageLocationId}
									onChange={(e) => setTargetStorageLocationId(e.target.value)}
									required
								>
									{filteredStorageLocations.map((l) => (
										<option key={l.id} value={l.id}>
											{l.locationCode} (Shelf {l.shelfNumber}, Bin {l.binNumber})
										</option>
									))}
								</select>
							</div>
						</div>
					)}
					{outcome !== 'APPROVED' && (
						<div>
							<label className='block text-xs font-semibold text-muted-foreground mb-1'>Rejection / Failure Reason</label>
							<select
								className='w-full rounded border border-border bg-background px-3 py-2 text-sm'
								value={rejectionReason}
								onChange={(e) => setRejectionReason(e.target.value)}
							>
								<option value='Damaged / Broken / Physical defect'>Damaged / Broken / Physical defect</option>
								<option value='Expired / Expiring beyond acceptable shelf life'>Expired / Expiring beyond acceptable shelf life</option>
								<option value='Contaminated / Seal compromised'>Contaminated / Seal compromised</option>
								<option value='Non-functional / Quality failure'>Non-functional / Quality failure</option>
								<option value='Missing components / accessories'>Missing components / accessories</option>
								<option value='Other'>Other</option>
							</select>
						</div>
					)}
					<div>
						<label className='block text-xs font-semibold text-muted-foreground mb-1'>Inspection Remarks & Notes</label>
						<textarea
							rows={2}
							className='w-full rounded border border-border bg-background px-3 py-2 text-sm'
							placeholder='Detailed inspection findings, batch verification notes, test observations...'
							value={remarks}
							onChange={(e) => setRemarks(e.target.value)}
						/>
					</div>
					{message && <p className='text-xs text-danger'>{message}</p>}
					<div className='flex justify-end gap-2 pt-2'>
						<button type='button' className='rounded border border-border px-3 py-2 text-sm' onClick={onClose}>
							Cancel
						</button>
						<button
							disabled={loading}
							type='submit'
							className='inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60'
						>
							<LoadingInline loading={loading} label='Finalize Inspection' loadingLabel='Recording...' />
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

function ReturnsSection({ token, user }: { token: string; user: User }) {
	const [returns, setReturns] = useState<any[]>([])
	const [loading, setLoading] = useState(false)
	const [showInitiateModal, setShowInitiateModal] = useState(false)
	const [selectedInspectReturn, setSelectedInspectReturn] = useState<any | null>(null)
	const [statusFilter, setStatusFilter] = useState('ALL')

	const canInspect = user.permissions.includes(permissions.RETURN_INSPECT)
	const canCreate = user.permissions.includes(permissions.RETURN_CREATE)

	const load = () => {
		setLoading(true)
		request<any[]>('/returns', token)
			.then(setReturns)
			.catch(() => setReturns([]))
			.finally(() => setLoading(false))
	}

	useEffect(() => {
		load()
	}, [token])

	const filteredReturns = returns.filter((r) => {
		if (statusFilter === 'ALL') return true
		return r.status === statusFilter
	})

	return (
		<Panel
			title='Returned Items Management'
			description='Dedicated storage location (RET-HOLDING-01) for returned items awaiting quality inspection and restock clearance.'
		>
			<div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
				<div className='flex items-center gap-2'>
					<span className='text-xs font-semibold text-muted-foreground'>Filter status:</span>
					<select
						className='rounded border border-border bg-background px-2.5 py-1.5 text-xs'
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
					>
						<option value='ALL'>All Returns ({returns.length})</option>
						<option value='PENDING_INSPECTION'>Pending Inspection</option>
						<option value='APPROVED'>Approved & Restocked</option>
						<option value='REJECTED'>Rejected & Quarantined</option>
						<option value='PARTIALLY_APPROVED'>Partially Approved</option>
					</select>
				</div>
				<div className='flex items-center gap-2'>
					<button
						className='inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs hover:bg-muted'
						onClick={load}
					>
						<Activity size={14} /> Refresh
					</button>
					{canCreate && (
						<button
							className='inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:opacity-90'
							onClick={() => setShowInitiateModal(true)}
						>
							<Plus size={14} /> Initiate Return
						</button>
					)}
				</div>
			</div>

			<DataTable
				rows={filteredReturns}
				empty='No returned items found.'
				columns={[
					{ key: 'returnNumber', label: 'Return №' },
					{
						key: 'voucher',
						label: 'Original SIV / Request',
						render: (row) =>
							row.voucher?.voucherNumber
								? `${row.voucher.voucherNumber} (${row.issueRequest?.requestNumber ?? 'Request'})`
								: row.issueRequest?.requestNumber ?? 'N/A',
					},
					{
						key: 'department',
						label: 'Department',
						render: (row) => row.department?.name ?? 'N/A',
					},
					{
						key: 'items',
						label: 'Returned Items',
						render: (row) =>
							row.lines
								?.map((l: any) => `${l.item?.description} (${l.quantityReturned})`)
								.join(', '),
					},
					{
						key: 'status',
						label: 'Status',
						render: (row) => {
							const color =
								row.status === 'APPROVED'
									? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
									: row.status === 'REJECTED'
									? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
									: row.status === 'PENDING_INSPECTION'
									? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
									: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
							return (
								<span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', color)}>
									{row.status.replace(/_/g, ' ')}
								</span>
							)
						},
					},
					{ key: 'reason', label: 'Reason' },
					{
						key: 'returnedAt',
						label: 'Return Date',
						render: (row) => new Date(row.returnedAt).toLocaleDateString(),
					},
					{
						key: 'actions',
						label: 'Actions',
						render: (row) => (
							<div className='flex gap-1.5'>
								{canInspect && row.status === 'PENDING_INSPECTION' && (
									<button
										className='inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow hover:opacity-90'
										onClick={() => setSelectedInspectReturn(row)}
									>
										<PackageSearch size={12} /> Inspect
									</button>
								)}
								{row.inspections?.[0] && (
									<span className='text-[11px] text-muted-foreground'>
										Inspected: {row.inspections[0].outcome} ({row.inspections[0].inspectedBy?.fullName})
									</span>
								)}
							</div>
						),
					},
				]}
			/>

			{showInitiateModal && (
				<ReturnItemModal
					token={token}
					user={user}
					onClose={() => {
						setShowInitiateModal(false)
						load()
					}}
				/>
			)}
			{selectedInspectReturn && (
				<InspectReturnModal
					token={token}
					returnRecord={selectedInspectReturn}
					onClose={() => {
						setSelectedInspectReturn(null)
						load()
					}}
				/>
			)}
		</Panel>
	)
}

function ApproverPortalSection({ token, user }: { token: string; user: User }) {
	const [queue, setQueue] = useState<{
		pendingIssues: any[]
		pendingAdjustments: any[]
		pendingDisposals: any[]
	}>({ pendingIssues: [], pendingAdjustments: [], pendingDisposals: [] })
	const [activeTab, setActiveTab] = useState<'issues' | 'adjustments' | 'disposals'>('issues')
	const [loading, setLoading] = useState(false)
	const [actionLoading, setActionLoading] = useState('')

	const load = () => {
		setLoading(true)
		request<any>('/approver/queue', token)
			.then(setQueue)
			.catch(() => setQueue({ pendingIssues: [], pendingAdjustments: [], pendingDisposals: [] }))
			.finally(() => setLoading(false))
	}

	useEffect(() => {
		load()
	}, [token])

	async function handleIssueDecision(id: string, decision: 'approve' | 'reject') {
		setActionLoading(`issue-${id}-${decision}`)
		try {
			await request(`/issues/${id}/${decision}`, token, {
				method: 'POST',
				body: JSON.stringify({ reason: `Approver decision: ${decision}` }),
			})
			notify(decision === 'approve' ? 'success' : 'warning', `Issue request ${decision}d successfully.`)
			load()
		} catch (err) {
			notify('error', errorMessage(err, 'Unable to process approval.'))
		} finally {
			setActionLoading('')
		}
	}

	async function handleAdjustmentDecision(id: string, approve: boolean) {
		setActionLoading(`adj-${id}-${approve ? 'approve' : 'reject'}`)
		try {
			await request(`/adjustments/${id}/${approve ? 'approve' : 'reject'}`, token, {
				method: 'POST',
				body: JSON.stringify({ comment: `Approver decision: ${approve ? 'Approved' : 'Rejected'}` }),
			})
			notify(approve ? 'success' : 'warning', `Stock adjustment ${approve ? 'approved' : 'rejected'}.`)
			load()
		} catch (err) {
			notify('error', errorMessage(err, 'Unable to process adjustment.'))
		} finally {
			setActionLoading('')
		}
	}

	async function handleDisposalDecision(id: string) {
		setActionLoading(`disp-${id}-approve`)
		try {
			await request(`/disposals/${id}/approve`, token, {
				method: 'POST',
				body: JSON.stringify({ notes: 'Disposal approved by Approver' }),
			})
			notify('success', 'Disposal request approved.')
			load()
		} catch (err) {
			notify('error', errorMessage(err, 'Unable to approve disposal.'))
		} finally {
			setActionLoading('')
		}
	}

	return (
		<section className='space-y-5'>
			<div className='rounded-xl border border-border bg-[linear-gradient(135deg,rgba(20,184,166,.12),hsl(var(--surface))_60%,rgba(59,130,246,.10))] p-5 shadow-sm'>
				<div className='flex flex-wrap items-center justify-between gap-4'>
					<div className='flex items-center gap-3.5'>
						<span className='grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary shadow-inner'>
							<ShieldCheck size={26} />
						</span>
						<div>
							<div className='flex items-center gap-2'>
								<h1 className='text-xl font-bold'>Approver Portal</h1>
								<span className='rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary'>
									Workflow Authority
								</span>
							</div>
							<p className='text-xs text-muted-foreground mt-0.5'>
								Review and authorize pending department stock requests, reconciliation adjustments, and disposal requests.
							</p>
						</div>
					</div>
					<button
						className='inline-flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3.5 py-2 text-xs font-medium shadow-sm hover:bg-background'
						onClick={load}
					>
						<Activity size={14} /> Refresh Queue
					</button>
				</div>

				<div className='mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3'>
					<button
						onClick={() => setActiveTab('issues')}
						className={cn(
							'rounded-lg border p-3.5 text-left transition',
							activeTab === 'issues'
								? 'border-primary bg-primary/10 shadow-sm'
								: 'border-border bg-background/50 hover:bg-background/80'
						)}
					>
						<p className='text-xs font-semibold text-muted-foreground uppercase'>Stock Issuance Requests</p>
						<p className='mt-1 text-2xl font-bold text-foreground'>{queue.pendingIssues.length}</p>
						<p className='text-[11px] text-muted-foreground mt-0.5'>Pending authorization</p>
					</button>
					<button
						onClick={() => setActiveTab('adjustments')}
						className={cn(
							'rounded-lg border p-3.5 text-left transition',
							activeTab === 'adjustments'
								? 'border-primary bg-primary/10 shadow-sm'
								: 'border-border bg-background/50 hover:bg-background/80'
						)}
					>
						<p className='text-xs font-semibold text-muted-foreground uppercase'>Reconciliation Adjustments</p>
						<p className='mt-1 text-2xl font-bold text-foreground'>{queue.pendingAdjustments.length}</p>
						<p className='text-[11px] text-muted-foreground mt-0.5'>Stock variance reviews</p>
					</button>
					<button
						onClick={() => setActiveTab('disposals')}
						className={cn(
							'rounded-lg border p-3.5 text-left transition',
							activeTab === 'disposals'
								? 'border-primary bg-primary/10 shadow-sm'
								: 'border-border bg-background/50 hover:bg-background/80'
						)}
					>
						<p className='text-xs font-semibold text-muted-foreground uppercase'>Disposal Requests</p>
						<p className='mt-1 text-2xl font-bold text-foreground'>{queue.pendingDisposals.length}</p>
						<p className='text-[11px] text-muted-foreground mt-0.5'>Damaged / obsolete stock</p>
					</button>
				</div>
			</div>

			{activeTab === 'issues' && (
				<Panel
					title='Pending Stock Issuance Approvals'
					description='Review requesting department needs and authorize stock deduction before store issuance.'
				>
					<DataTable
						rows={queue.pendingIssues}
						empty='No stock issue requests pending approval.'
						columns={[
							{ key: 'requestNumber', label: 'Request №' },
							{ key: 'department', label: 'Department', render: (row) => row.department?.name },
							{ key: 'recipientName', label: 'Recipient', render: (row) => row.recipientName ?? row.requestedBy?.fullName ?? 'N/A' },
							{ key: 'purpose', label: 'Purpose' },
							{
								key: 'items',
								label: 'Requested Items',
								render: (row) =>
									row.lines?.map((l: any) => `${l.item?.description} (${l.quantity})`).join(', '),
							},
							{ key: 'status', label: 'Status' },
							{
								key: 'createdAt',
								label: 'Submitted Date',
								render: (row) => new Date(row.createdAt).toLocaleString(),
							},
							{
								key: 'actions',
								label: 'Decision',
								render: (row) => (
									<div className='flex gap-2'>
										<button
											disabled={actionLoading === `issue-${row.id}-approve`}
											className='inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60'
											onClick={() => handleIssueDecision(row.id, 'approve')}
										>
											<LoadingInline loading={actionLoading === `issue-${row.id}-approve`} label='Approve' loadingLabel='Approving...' />
										</button>
										<button
											disabled={actionLoading === `issue-${row.id}-reject`}
											className='inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-60'
											onClick={() => handleIssueDecision(row.id, 'reject')}
										>
											<LoadingInline loading={actionLoading === `issue-${row.id}-reject`} label='Reject' loadingLabel='Rejecting...' />
										</button>
									</div>
								),
							},
						]}
					/>
				</Panel>
			)}

			{activeTab === 'adjustments' && (
				<Panel
					title='Pending Stock Reconciliation Adjustments'
					description='Review inventory count variances and authorize balance adjustments.'
				>
					<DataTable
						rows={queue.pendingAdjustments}
						empty='No reconciliation adjustments pending approval.'
						columns={[
							{ key: 'adjustmentNumber', label: 'Adjustment №' },
							{ key: 'item', label: 'Item', render: (row) => row.item?.description },
							{ key: 'quantity', label: 'Variance Quantity' },
							{ key: 'reason', label: 'Reason' },
							{ key: 'requestedBy', label: 'Requested By', render: (row) => row.requestedBy?.fullName },
							{
								key: 'actions',
								label: 'Decision',
								render: (row) => (
									<div className='flex gap-2'>
										<button
											disabled={actionLoading === `adj-${row.id}-approve`}
											className='inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60'
											onClick={() => handleAdjustmentDecision(row.id, true)}
										>
											<LoadingInline loading={actionLoading === `adj-${row.id}-approve`} label='Approve' loadingLabel='Approving...' />
										</button>
										<button
											disabled={actionLoading === `adj-${row.id}-reject`}
											className='inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-60'
											onClick={() => handleAdjustmentDecision(row.id, false)}
										>
											<LoadingInline loading={actionLoading === `adj-${row.id}-reject`} label='Reject' loadingLabel='Rejecting...' />
										</button>
									</div>
								),
							},
						]}
					/>
				</Panel>
			)}

			{activeTab === 'disposals' && (
				<Panel
					title='Pending Disposal Requests'
					description='Review items proposed for write-off, disposal, or destruction.'
				>
					<DataTable
						rows={queue.pendingDisposals}
						empty='No disposal requests pending approval.'
						columns={[
							{ key: 'disposalNumber', label: 'Disposal №' },
							{ key: 'reason', label: 'Reason' },
							{ key: 'status', label: 'Status' },
							{
								key: 'items',
								label: 'Proposed Items',
								render: (row) =>
									row.lines?.map((l: any) => `${l.item?.description} (${l.quantity})`).join(', '),
							},
							{
								key: 'actions',
								label: 'Decision',
								render: (row) => (
									<button
										disabled={actionLoading === `disp-${row.id}-approve`}
										className='inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60'
										onClick={() => handleDisposalDecision(row.id)}
									>
										<LoadingInline loading={actionLoading === `disp-${row.id}-approve`} label='Approve Disposal' loadingLabel='Approving...' />
									</button>
								),
							},
						]}
					/>
				</Panel>
			)}
		</section>
	)
}

function InspectorPortalSection({ token, user }: { token: string; user: User }) {
	const [queue, setQueue] = useState<{
		pendingReturns: any[]
		pendingGrns: any[]
		recentInspections: any[]
	}>({ pendingReturns: [], pendingGrns: [], recentInspections: [] })
	const [activeTab, setActiveTab] = useState<'returns' | 'grns' | 'history'>('returns')
	const [loading, setLoading] = useState(false)
	const [selectedReturn, setSelectedReturn] = useState<any | null>(null)

	const load = () => {
		setLoading(true)
		request<any>('/inspector/queue', token)
			.then(setQueue)
			.catch(() => setQueue({ pendingReturns: [], pendingGrns: [], recentInspections: [] }))
			.finally(() => setLoading(false))
	}

	useEffect(() => {
		load()
	}, [token])

	return (
		<section className='space-y-5'>
			<div className='rounded-xl border border-border bg-[linear-gradient(135deg,rgba(59,130,246,.12),hsl(var(--surface))_60%,rgba(20,184,166,.10))] p-5 shadow-sm'>
				<div className='flex flex-wrap items-center justify-between gap-4'>
					<div className='flex items-center gap-3.5'>
						<span className='grid h-12 w-12 place-items-center rounded-xl bg-blue-500/15 text-blue-400 shadow-inner'>
							<PackageSearch size={26} />
						</span>
						<div>
							<div className='flex items-center gap-2'>
								<h1 className='text-xl font-bold'>Inspector Portal</h1>
								<span className='rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-300'>
									Quality Inspection & Verification
								</span>
							</div>
							<p className='text-xs text-muted-foreground mt-0.5'>
								Physically inspect returned items in holding storage (RET-HOLDING-01) and incoming goods receipts.
							</p>
						</div>
					</div>
					<button
						className='inline-flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3.5 py-2 text-xs font-medium shadow-sm hover:bg-background'
						onClick={load}
					>
						<Activity size={14} /> Refresh Inspection Queue
					</button>
				</div>

				<div className='mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3'>
					<button
						onClick={() => setActiveTab('returns')}
						className={cn(
							'rounded-lg border p-3.5 text-left transition',
							activeTab === 'returns'
								? 'border-blue-500 bg-blue-500/10 shadow-sm'
								: 'border-border bg-background/50 hover:bg-background/80'
						)}
					>
						<p className='text-xs font-semibold text-muted-foreground uppercase'>Returned Items Queue</p>
						<p className='mt-1 text-2xl font-bold text-foreground'>{queue.pendingReturns.length}</p>
						<p className='text-[11px] text-muted-foreground mt-0.5'>In holding storage (RET-HOLDING-01)</p>
					</button>
					<button
						onClick={() => setActiveTab('grns')}
						className={cn(
							'rounded-lg border p-3.5 text-left transition',
							activeTab === 'grns'
								? 'border-blue-500 bg-blue-500/10 shadow-sm'
								: 'border-border bg-background/50 hover:bg-background/80'
						)}
					>
						<p className='text-xs font-semibold text-muted-foreground uppercase'>Goods Receiving (GRN) Queue</p>
						<p className='mt-1 text-2xl font-bold text-foreground'>{queue.pendingGrns.length}</p>
						<p className='text-[11px] text-muted-foreground mt-0.5'>Supplier delivery verification</p>
					</button>
					<button
						onClick={() => setActiveTab('history')}
						className={cn(
							'rounded-lg border p-3.5 text-left transition',
							activeTab === 'history'
								? 'border-blue-500 bg-blue-500/10 shadow-sm'
								: 'border-border bg-background/50 hover:bg-background/80'
						)}
					>
						<p className='text-xs font-semibold text-muted-foreground uppercase'>Recent Inspections</p>
						<p className='mt-1 text-2xl font-bold text-foreground'>{queue.recentInspections.length}</p>
						<p className='text-[11px] text-muted-foreground mt-0.5'>Cleared and restocked logs</p>
					</button>
				</div>
			</div>

			{activeTab === 'returns' && (
				<Panel
					title='Returned Items Pending Inspection'
					description='Physically verify condition, evaluate restocking suitability, and allocate approved stock back to main warehouse locations.'
				>
					<DataTable
						rows={queue.pendingReturns}
						empty='No returned items currently awaiting inspection.'
						columns={[
							{ key: 'returnNumber', label: 'Return №' },
							{
								key: 'voucher',
								label: 'Original SIV / Request',
								render: (row) => row.voucher?.voucherNumber ?? row.issueRequest?.requestNumber ?? 'N/A',
							},
							{ key: 'department', label: 'Department', render: (row) => row.department?.name },
							{
								key: 'items',
								label: 'Returned Items',
								render: (row) =>
									row.lines?.map((l: any) => `${l.item?.description} (${l.quantityReturned})`).join(', '),
							},
							{ key: 'reason', label: 'Return Reason' },
							{ key: 'conditionNotes', label: 'Condition Notes', render: (row) => row.conditionNotes || 'None' },
							{
								key: 'returnedAt',
								label: 'Received into Holding',
								render: (row) => new Date(row.returnedAt).toLocaleString(),
							},
							{
								key: 'actions',
								label: 'Action',
								render: (row) => (
									<button
										className='inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:opacity-90'
										onClick={() => setSelectedReturn(row)}
									>
										<PackageSearch size={14} /> Inspect & Clear
									</button>
								),
							},
						]}
					/>
				</Panel>
			)}

			{activeTab === 'grns' && (
				<Panel
					title='Goods Receiving Notes Pending Inspection'
					description='Quality check supplier shipments before warehouse storage allocation.'
				>
					<DataTable
						rows={queue.pendingGrns}
						empty='No goods receiving deliveries pending inspection.'
						columns={[
							{ key: 'grn', label: 'GRN №', render: (row) => row.grn?.grnNumber },
							{ key: 'supplier', label: 'Supplier / Donor', render: (row) => row.grn?.supplierDonor?.name },
							{ key: 'item', label: 'Item', render: (row) => row.item?.description },
							{ key: 'quantityReceived', label: 'Qty Received' },
							{ key: 'batchNumber', label: 'Batch №' },
							{ key: 'expiryDate', label: 'Expiry Date', render: (row) => row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : 'N/A' },
						]}
					/>
				</Panel>
			)}

			{activeTab === 'history' && (
				<Panel
					title='Completed Inspection Records'
					description='Historical audit trail of all physical inspections, clearance outcomes, and restock destinations.'
				>
					<DataTable
						rows={queue.recentInspections}
						empty='No completed inspection records found.'
						columns={[
							{
								key: 'returnNumber',
								label: 'Return №',
								render: (row) => row.returnRecord?.returnNumber,
							},
							{
								key: 'department',
								label: 'Department',
								render: (row) => row.returnRecord?.department?.name,
							},
							{
								key: 'outcome',
								label: 'Outcome',
								render: (row) => {
									const color =
										row.outcome === 'APPROVED'
											? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
											: row.outcome === 'REJECTED'
											? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
											: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
									return (
										<span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', color)}>
											{row.outcome.replace(/_/g, ' ')}
										</span>
									)
								},
							},
							{ key: 'qualityStatus', label: 'Quality Status' },
							{
								key: 'quantities',
								label: 'Accepted / Rejected',
								render: (row) => `${row.quantityAccepted} accepted / ${row.quantityRejected} rejected`,
							},
							{
								key: 'targetStore',
								label: 'Restock Destination',
								render: (row) => row.targetStore ? `${row.targetStore.name} (${row.targetStorageLocation?.locationCode ?? 'Shelf'})` : 'Quarantine',
							},
							{ key: 'inspectedBy', label: 'Inspector', render: (row) => row.inspectedBy?.fullName },
							{
								key: 'inspectedAt',
								label: 'Inspection Date',
								render: (row) => new Date(row.inspectedAt).toLocaleString(),
							},
						]}
					/>
				</Panel>
			)}

			{selectedReturn && (
				<InspectReturnModal
					token={token}
					returnRecord={selectedReturn}
					onClose={() => {
						setSelectedReturn(null)
						load()
					}}
				/>
			)}
		</section>
	)
}

function SimpleModule({
	token,
	path,
	title,
	columns,
}: {
	token: string
	path: string
	title: string
	columns: any[]
}) {
	const [rows, setRows] = useState<any[]>([])
	const [error, setError] = useState('')
	useEffect(() => {
		request<any[]>(path, token)
			.then(setRows)
			.catch((err) => setError(errorMessage(err, 'Unable to load records.')))
	}, [path, token])
	if (error) return <ErrorState message={error} />
	return (
		<Panel title={title}>
			<DataTable rows={rows} columns={columns} />
		</Panel>
	)
}

function PhysicalCounts({ token }: { token: string }) {
	const [rows, setRows] = useState<any[]>([])
	const [message, setMessage] = useState('')
	const [countInputs, setCountInputs] = useState<Record<string, number>>({})
	const [loadingAction, setLoadingAction] = useState('')
	const load = () => request<any[]>('/physical-counts', token).then(setRows)
	useEffect(() => {
		load().catch((err) =>
			setMessage(errorMessage(err, 'Unable to load physical counts.'))
		)
	}, [token])
	async function openCount() {
		setLoadingAction('open')
		try {
			await request('/physical-counts', token, {
				method: 'POST',
				body: JSON.stringify({ cycleType: 'MONTHLY' }),
			})
			setMessage('Count session opened from current ledger balances.')
			notify('success', 'Count session opened from current ledger balances.')
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to open count session.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	async function submit(row: any) {
		const lines = row.lines.map((line: any) => ({
			id: line.id,
			systemQuantity: Number(line.systemQuantity),
			countedQuantity: Number(
				countInputs[line.id] ?? line.countedQuantity ?? line.systemQuantity
			),
			notes: 'Submitted from UI',
		}))
		setLoadingAction(row.id)
		try {
			await request(`/physical-counts/${row.id}/submit`, token, {
				method: 'POST',
				body: JSON.stringify({ lines }),
			})
			setMessage('Count submitted. Variances create pending adjustments.')
			notify(
				'success',
				'Count submitted. Variances create pending adjustments.'
			)
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to submit count.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	return (
		<Panel
			title='Physical Inventory'
			action={
				<button
					disabled={loadingAction === 'open'}
					className='rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60'
					onClick={openCount}
				>
					<LoadingInline
						loading={loadingAction === 'open'}
						label='Open monthly count'
						loadingLabel='Opening...'
					/>
				</button>
			}
		>
			{message && (
				<p className='mb-3 rounded border border-border bg-muted px-3 py-2 text-sm'>
					{message}
				</p>
			)}
			<DataTable
				rows={rows}
				columns={[
					{ key: 'countNumber', label: 'Count' },
					{ key: 'cycleType', label: 'Cycle' },
					{ key: 'status', label: 'Status' },
					{
						key: 'lines',
						label: 'Lines',
						render: (row) => row.lines?.length ?? 0,
					},
					{
						key: 'countEntry',
						label: 'Physical counts',
						render: (row) =>
							row.status === 'OPEN' || row.status === 'COUNTING' ? (
								<div className='physical-count-entry'>
									{row.lines?.slice(0, 3).map((line: any) => (
										<label key={line.id} className='physical-count-line'>
											<span>{line.item?.description}</span>
											<small>System {String(line.systemQuantity)}</small>
											<input
												type='number'
												placeholder='Count'
												value={
													countInputs[line.id] ?? Number(line.systemQuantity)
												}
												onChange={(e) =>
													setCountInputs({
														...countInputs,
														[line.id]: Number(e.target.value),
													})
												}
											/>
										</label>
									))}
									{(row.lines?.length ?? 0) > 3 && (
										<span className='text-xs text-muted-foreground'>
											Showing first 3 lines
										</span>
									)}
								</div>
							) : (
								'Submitted'
							),
					},
					{
						key: 'action',
						label: 'Action',
						render: (row) =>
							row.status === 'OPEN' || row.status === 'COUNTING' ? (
								<button
									disabled={loadingAction === row.id}
									className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
									onClick={() => submit(row)}
								>
									<LoadingInline
										loading={loadingAction === row.id}
										label='Submit counts'
										loadingLabel='Submitting...'
									/>
								</button>
							) : (
								row.status
							),
					},
				]}
			/>
		</Panel>
	)
}

function DisposalManagement({ token, user }: { token: string; user: User }) {
	const [rows, setRows] = useState<any[]>([])
	const [balances, setBalances] = useState<any[]>([])
	const [master, setMaster] = useState<any>()
	const [message, setMessage] = useState('')
	const [reason, setReason] = useState('')
	const [selectedBalanceId, setSelectedBalanceId] = useState('')
	const [quantity, setQuantity] = useState(1)
	const [loadingAction, setLoadingAction] = useState('')
	const canWrite = user.permissions.includes(permissions.DISPOSAL_WRITE)
	const canApprove = user.permissions.includes(permissions.DISPOSAL_APPROVE)
	const load = async () => {
		const [disposalRows, balanceRows, masterData] = await Promise.all([
			request<any[]>('/disposals', token),
			request<any[]>('/location-balances', token),
			request<any>('/master-data', token),
		])
		setRows(disposalRows)
		setBalances(balanceRows.filter((row) => Number(row.quantityAvailable) > 0))
		setSelectedBalanceId(
			(current) =>
				current ||
				balanceRows.find((row: any) => Number(row.quantityAvailable) > 0)?.id ||
				''
		)
		setMaster(masterData)
		setReason(
			(current) => current || masterData.disposalReasons?.[0]?.name || ''
		)
	}
	useEffect(() => {
		load().catch((err) =>
			setMessage(errorMessage(err, 'Unable to load disposal records.'))
		)
	}, [token])
	async function createDisposal(event: React.FormEvent) {
		event.preventDefault()
		const balance = balances.find((row) => row.id === selectedBalanceId)
		if (!balance) {
			setMessage('No available located stock to propose for disposal.')
			notify('warning', 'No available located stock to propose for disposal.')
			return
		}
		if (quantity <= 0 || quantity > Number(balance.quantityAvailable)) {
			setMessage('Enter a disposal quantity within the available stock.')
			notify('warning', 'Enter a disposal quantity within the available stock.')
			return
		}
		setLoadingAction('create')
		try {
			await request('/disposals', token, {
				method: 'POST',
				body: JSON.stringify({
					reason,
					lines: [
						{
							itemId: balance.itemId,
							batchId: balance.batchId,
							storageLocationId: balance.storageLocationId,
							storeId: balance.storeId,
							quantity,
							batchNumber: balance.batch?.batchNumber,
							expiryDate: balance.batch?.expiryDate,
						},
					],
				}),
			})
			setMessage('Disposal request created for committee review.')
			notify('success', 'Disposal request created for committee review.')
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to create disposal request.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	async function action(id: string, endpoint: string, success: string) {
		setLoadingAction(`${id}-${endpoint}`)
		try {
			await request(`/disposals/${id}/${endpoint}`, token, {
				method: 'POST',
				body: JSON.stringify({
					committeeNotes: 'Committee reviewed from UI',
					method: 'Documented disposal',
					responsibleParties: 'Storekeeper',
				}),
			})
			setMessage(success)
			notify('success', success)
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to complete disposal action.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	return (
		<Panel title='Disposal Management'>
			{canWrite && (
				<form
					onSubmit={createDisposal}
					className='mb-4 grid gap-3 rounded border border-border p-3 md:grid-cols-5'
				>
					<select
						className='rounded border border-border bg-background px-3 py-2 text-sm md:col-span-2'
						value={selectedBalanceId}
						onChange={(e) => setSelectedBalanceId(e.target.value)}
					>
						<option value=''>Select item and storage location</option>
						{balances.map((balance) => (
							<option key={balance.id} value={balance.id}>
								{balance.item?.description} / {balance.store?.name} shelf{' '}
								{balance.storageLocation?.shelfNumber} bin{' '}
								{balance.storageLocation?.binNumber} / available{' '}
								{String(balance.quantityAvailable)}
							</option>
						))}
					</select>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						type='number'
						min='1'
						placeholder='Quantity proposed'
						value={quantity}
						onChange={(e) => setQuantity(Number(e.target.value))}
					/>
					<select
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						required
					>
						<option value=''>Select reason for disposal</option>
						{master?.disposalReasons?.map((row: any) => (
							<option key={row.id} value={row.name}>
								{row.name}
							</option>
						))}
					</select>
					<button
						disabled={loadingAction === 'create'}
						className='rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60'
					>
						<LoadingInline
							loading={loadingAction === 'create'}
							label='Create request'
							loadingLabel='Creating...'
						/>
					</button>
				</form>
			)}
			{message && (
				<p className='mb-3 rounded border border-border bg-muted px-3 py-2 text-sm'>
					{message}
				</p>
			)}
			<DataTable
				rows={rows}
				columns={[
					{ key: 'disposalNumber', label: 'Request' },
					{ key: 'reason', label: 'Reason' },
					{ key: 'status', label: 'Status' },
					{
						key: 'lines',
						label: 'Lines',
						render: (row) =>
							row.lines
								?.map(
									(line: any) => `${line.item?.description} (${line.quantity})`
								)
								.join(', '),
					},
					{
						key: 'actions',
						label: 'Actions',
						render: (row) => (
							<div className='flex flex-wrap gap-2'>
								{canApprove &&
									[
										'COMMITTEE_REVIEW',
										'UNDER_REVIEW',
										'PENDING_APPROVAL',
									].includes(row.status) && (
										<button
											disabled={loadingAction === `${row.id}-approve`}
											className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
											onClick={() =>
												action(row.id, 'approve', 'Disposal approved.')
											}
										>
											<LoadingInline
												loading={loadingAction === `${row.id}-approve`}
												label='Approve'
												loadingLabel='Approving...'
											/>
										</button>
									)}
								{canWrite && row.status === 'APPROVED' && (
									<button
										disabled={loadingAction === `${row.id}-dispose`}
										className='rounded border border-border px-2 py-1 text-xs disabled:opacity-60'
										onClick={() =>
											action(
												row.id,
												'dispose',
												'Disposal completed and stock deducted.'
											)
										}
									>
										<LoadingInline
											loading={loadingAction === `${row.id}-dispose`}
											label='Dispose'
											loadingLabel='Disposing...'
										/>
									</button>
								)}
							</div>
						),
					},
				]}
			/>
		</Panel>
	)
}

function reportReference(row: any) {
	return (
		row.grnNumber ??
		row.requestNumber ??
		row.voucherNumber ??
		row.disposalNumber ??
		row.countNumber ??
		row.adjustmentNumber ??
		row.entryNumber ??
		row.item?.description ??
		row.item?.code ??
		row.description ??
		row.code ??
		row.action ??
		row.id ??
		'Row'
	)
}

function reportStatus(
	row: any,
	reportType?: (typeof reportTypes)[number],
	item = row.item ?? row
) {
	const explicit = row.status ?? row.stockStatus
	if (explicit) return formatStatus(explicit)
	if (
		reportType &&
		['stock-status', 'balance', 'valuation', 'stock-out', 'reorder'].includes(
			reportType
		)
	) {
		const quantity = Number(
			row.quantity ?? row.quantityAvailable ?? row.currentStock ?? 0
		)
		const minimum = Number(item?.minimumStock ?? row.minimumStock ?? 0)
		const reorder = Number(item?.reorderLevel ?? row.reorderLevel ?? minimum)
		const maximum = Number(
			item?.maximumStock ?? row.maximumStock ?? Number.POSITIVE_INFINITY
		)
		if (quantity <= 0) return 'Stock Out'
		if (quantity < minimum) return 'Below Minimum'
		if (quantity <= reorder) return 'Low Stock'
		if (Number.isFinite(maximum) && quantity > maximum) return 'Overstock'
		return 'Normal'
	}
	return formatStatus(row.type ?? row.sourceType ?? row.method ?? 'Recorded')
}

function reportQuantity(row: any, line?: any) {
	return (
		line?.quantity ??
		line?.quantityReceived ??
		line?.systemQuantity ??
		row.quantity ??
		row.quantityAvailable ??
		row.quantityOnHand ??
		row.currentStock ??
		row.issuedQuantity ??
		row.totalAcceptedQuantity ??
		row.remainingQuantity ??
		row.lines?.reduce?.(
			(sum: number, line: any) =>
				sum +
				Number(
					line.quantity ?? line.quantityReceived ?? line.systemQuantity ?? 0
				),
			0
		) ??
		'N/A'
	)
}

function reportDate(row: any) {
	const value =
		row.postedAt ??
		row.createdAt ??
		row.receivedAt ??
		row.issuedAt ??
		row.openedAt ??
		row.assignedAt ??
		row.expiryDate ??
		row.batch?.expiryDate
	return value ? new Date(value).toLocaleString() : 'N/A'
}

function reportFlatRow(row: any, reportType?: (typeof reportTypes)[number]) {
	const item =
		row.item ?? row.lines?.[0]?.item ?? row.issueRequest?.lines?.[0]?.item
	return {
		date: reportDate(row),
		reference: reportReference(row),
		itemCode: item?.code ?? row.code ?? 'N/A',
		item: item?.description ?? row.description ?? 'N/A',
		category: item?.category?.name ?? 'N/A',
		unit: item?.unit?.symbol ?? 'N/A',
		provider: row.supplierDonor?.name ?? 'N/A',
		department:
			row.department?.name ??
			row.custodianDepartment?.name ??
			row.issueRequest?.department?.name ??
			'N/A',
		status: reportStatus(row, reportType, item ?? row),
		quantity: reportQuantity(row),
		value: row.value ?? 'N/A',
		assetTag: row.assetTag ?? 'N/A',
		serialNumber: row.serialNumber ?? 'N/A',
		custodian: row.custodianName ?? 'N/A',
		condition: row.condition?.replaceAll('_', ' ') ?? 'N/A',
		assignedAt: row.assignedAt ? formatDate(row.assignedAt) : 'N/A',
		returnedAt: row.returnedAt ? formatDate(row.returnedAt) : 'N/A',
	}
}

function reportFlatRows(type: (typeof reportTypes)[number], rows: any[]) {
	if (
		[
			'receipt',
			'grn',
			'issue',
			'store-issue-voucher',
			'physical-count',
			'disposal',
		].includes(type)
	) {
		return rows.flatMap((row) => {
			const lines = row.lines ?? row.issueRequest?.lines ?? []
			if (!lines.length) return [reportFlatRow(row, type)]
			return lines.map((line: any) => {
				const item = line.item ?? row.item
				return {
					...reportFlatRow(row, type),
					itemCode: item?.code ?? 'N/A',
					item: item?.description ?? 'N/A',
					category: item?.category?.name ?? 'N/A',
					unit: item?.unit?.symbol ?? 'N/A',
					quantity: reportQuantity(row, line),
					value: line.unitPrice
						? Number(line.unitPrice) * Number(reportQuantity(row, line) ?? 0)
						: 'N/A',
				}
			})
		})
	}
	return rows.map((row) => reportFlatRow(row, type))
}

function reportColumns(type: (typeof reportTypes)[number]) {
	const stock = [
		{ key: 'itemCode', label: 'Item code' },
		{ key: 'item', label: 'Item description' },
		{ key: 'category', label: 'Category' },
		{ key: 'unit', label: 'Unit' },
		{ key: 'quantity', label: 'Quantity' },
		{ key: 'status', label: 'Status' },
	]
	if (type === 'receipt' || type === 'grn')
		return [
			{ key: 'date', label: 'Date' },
			{ key: 'reference', label: 'GRN' },
			{ key: 'provider', label: 'Supplier / donor' },
			...stock,
		]
	if (type === 'issue' || type === 'store-issue-voucher')
		return [
			{ key: 'date', label: 'Date' },
			{ key: 'reference', label: 'Request / SIV' },
			{ key: 'department', label: 'Department' },
			...stock,
		]
	if (type === 'valuation') return [...stock, { key: 'value', label: 'Value' }]
	if (type === 'asset-custody')
		return [
			{ key: 'assetTag', label: 'Asset tag' },
			{ key: 'serialNumber', label: 'Serial number' },
			{ key: 'itemCode', label: 'Item code' },
			{ key: 'item', label: 'Item description' },
			{ key: 'custodian', label: 'Custodian' },
			{ key: 'department', label: 'Department' },
			{ key: 'assignedAt', label: 'Assigned' },
			{ key: 'returnedAt', label: 'Returned' },
			{ key: 'condition', label: 'Condition' },
			{ key: 'status', label: 'Status' },
		]
	if (type === 'audit-log')
		return [
			{ key: 'date', label: 'Date' },
			{ key: 'reference', label: 'Record' },
			{ key: 'status', label: 'Action' },
		]
	return stock
}

function Reports({ token, user }: { token: string; user: User }) {
	const allowedReports = useMemo(() => reportsForRole(user.role), [user.role])
	const [type, setType] = useState<ReportType>(
		allowedReports[0] ?? 'stock-status'
	)
	const [filters, setFilters] = useState({
		dateFrom: '',
		dateTo: '',
		itemId: '',
		categoryId: '',
		locationId: '',
		departmentId: '',
		fundingSourceId: '',
		supplierDonorId: '',
		status: '',
	})
	const [preview, setPreview] = useState<any[]>([])
	const [message, setMessage] = useState('')
	const [loadingAction, setLoadingAction] = useState('')
	const [favorites, setFavorites] = useState<string[]>(() =>
		cachedValue('fmoh-report-favorites', [])
	)
	useEffect(() => {
		if (!allowedReports.includes(type))
			selectReport(allowedReports[0] ?? 'stock-status')
	}, [allowedReports, type])
	const previewRows = useMemo(
		() => reportFlatRows(type, preview),
		[type, preview]
	)
	const previewColumns = useMemo(() => reportColumns(type), [type])
	const featuredReports = (
		[
			'stock-status',
			'valuation',
			'receipt',
			'issue',
			'physical-count',
			'audit-log',
		] as const
	).filter((report) => allowedReports.includes(report))
	function selectReport(report: ReportType) {
		setType(report)
		setPreview([])
		setMessage('')
	}
	function toggleFavorite(report: string) {
		const next = favorites.includes(report)
			? favorites.filter((item) => item !== report)
			: [...favorites, report]
		setFavorites(next)
		void writeStoredValue('fmoh-report-favorites', next)
	}
	useEffect(() => {
		void readStoredValue('fmoh-report-favorites', favorites).then(setFavorites)
	}, [])
	async function loadPreview() {
		const params = new URLSearchParams()
		Object.entries(filters).forEach(
			([key, value]) => value && params.set(key, value)
		)
		setLoadingAction('preview')
		try {
			const rows = await request<any[]>(
				`/reports/${type}?${params.toString()}`,
				token
			)
			setPreview(rows)
			setMessage(`${rows.length} report rows loaded from backend.`)
			notify('success', `${rows.length} report rows loaded from backend.`)
		} catch (err) {
			const message = errorMessage(err, 'Unable to load report.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	async function download(format: 'xlsx' | 'pdf') {
		const params = new URLSearchParams()
		Object.entries(filters).forEach(
			([key, value]) => value && params.set(key, value)
		)
		setLoadingAction(format)
		try {
			const baseUrl = await apiBaseUrl()
			const response = await fetch(
				`${baseUrl}/api/reports/${type}.${format}?${params.toString()}`,
				{ headers: { Authorization: `Bearer ${token}` } }
			)
			if (!response.ok) throw new Error(await friendlyResponseError(response))
			const blob = await response.blob()
			await saveBlobFile(`${type}.${format}`, blob, [
				{ name: format.toUpperCase(), extensions: [format] },
			])
			setMessage(`${format.toUpperCase()} export generated successfully.`)
			notify(
				'success',
				`${format.toUpperCase()} export generated successfully.`
			)
		} catch (err) {
			if (isDesktop()) {
				try {
					const rows = await request<any[]>(
						`/reports/${type}?${params.toString()}`,
						token
					)
					setPreview(rows)
					if (format === 'xlsx') {
						const flatRows = reportFlatRows(type, rows)
						const columns = reportColumns(type)
						const csv = [
							[
								`FMOH Inventory Management System - ${type.replaceAll('-', ' ')} report`,
							]
								.map((value) => JSON.stringify(value))
								.join(','),
							[`Generated: ${new Date().toLocaleString()}`]
								.map((value) => JSON.stringify(value))
								.join(','),
							[`Rows: ${flatRows.length}`]
								.map((value) => JSON.stringify(value))
								.join(','),
							'',
							columns.map((column) => JSON.stringify(column.label)).join(','),
							...flatRows.map((row) =>
								columns
									.map((column) => JSON.stringify(row[column.key] ?? ''))
									.join(',')
							),
						].join('\n')
						await saveTextFile(`${type}.csv`, csv, [
							{ name: 'CSV', extensions: ['csv'] },
						])
					} else {
						await new Promise((resolve) => window.setTimeout(resolve, 100))
						await printCurrentView()
					}
					const text =
						format === 'pdf'
							? 'Desktop print preview opened with live report data.'
							: 'Desktop CSV fallback generated from the local database.'
					setMessage(text)
					notify('warning', text)
					return
				} catch {
					// Fall through to the original export error below.
				}
			}
			const message = errorMessage(err, 'Unable to export report.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoadingAction('')
		}
	}
	return (
		<Panel
			title='Reports'
			description='Preview, favorite, and export operational reports without leaving the desktop workflow.'
		>
			<div className='no-print mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
				{featuredReports.map((report) => {
					const selected = type === report
					return (
						<button
							key={report}
							className={cn(
								'group rounded-lg border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
								selected
									? 'border-primary/45 bg-primary/10'
									: 'border-border bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--surface-subtle)))]'
							)}
							onClick={() => selectReport(report)}
						>
							<span className='flex items-start justify-between gap-3'>
								<span className='grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary'>
									<FileDown size={19} />
								</span>
								<span className='flex items-center gap-2'>
									{favorites.includes(report) && (
										<Star className='fill-amber-400 text-amber-400' size={15} />
									)}
									<ArrowUpRight
										className='text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground'
										size={16}
									/>
								</span>
							</span>
							<span className='mt-4 block text-sm font-semibold capitalize'>
								{report.replaceAll('-', ' ')}
							</span>
							<span className='mt-1 block text-xs text-muted-foreground'>
								Preview, PDF, Excel, and table export controls.
							</span>
						</button>
					)
				})}
			</div>
			<div className='no-print mb-4 grid gap-3 rounded border border-border p-3 md:grid-cols-[1.2fr_1fr_1fr_auto]'>
				<select
					className='rounded border border-border bg-background px-3 py-2 text-sm'
					value={type}
					onChange={(e) => setType(e.target.value as any)}
				>
					{allowedReports.map((report) => (
						<option key={report} value={report}>
							{report.replaceAll('-', ' ')}
						</option>
					))}
				</select>
				<label className='grid gap-1 text-xs text-muted-foreground'>
					Start date
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
						type='date'
						aria-label='Start date filter, format DD/MM/YYYY'
						title='Start date format: DD/MM/YYYY'
						value={filters.dateFrom}
						onChange={(e) =>
							setFilters({ ...filters, dateFrom: e.target.value })
						}
					/>
					<span className='date-format-hint'>DD/MM/YYYY</span>
				</label>
				<label className='grid gap-1 text-xs text-muted-foreground'>
					End date
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm text-foreground'
						type='date'
						aria-label='End date filter, format DD/MM/YYYY'
						title='End date format: DD/MM/YYYY'
						value={filters.dateTo}
						onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
					/>
					<span className='date-format-hint'>DD/MM/YYYY</span>
				</label>
				<button
					disabled={loadingAction === 'preview'}
					className='rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60'
					onClick={loadPreview}
				>
					<LoadingInline
						loading={loadingAction === 'preview'}
						label='Preview'
						loadingLabel='Loading...'
					/>
				</button>
			</div>
			<div className='no-print mb-4 flex flex-wrap items-center gap-2'>
				<button
					className='inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm'
					onClick={() => toggleFavorite(type)}
				>
					<Star
						size={16}
						className={
							favorites.includes(type) ? 'fill-amber-400 text-amber-400' : ''
						}
					/>{' '}
					{favorites.includes(type) ? 'Favorited' : 'Favorite'}
				</button>
				<button
					disabled={loadingAction === 'xlsx'}
					className='inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm disabled:opacity-60'
					onClick={() => download('xlsx')}
				>
					<FileDown size={16} />{' '}
					<LoadingInline
						loading={loadingAction === 'xlsx'}
						label='Excel'
						loadingLabel='Exporting...'
					/>
				</button>
				<button
					disabled={loadingAction === 'pdf'}
					className='inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm disabled:opacity-60'
					onClick={() => download('pdf')}
				>
					<FileDown size={16} />{' '}
					<LoadingInline
						loading={loadingAction === 'pdf'}
						label='PDF'
						loadingLabel='Exporting...'
					/>
				</button>
				<button
					className='rounded border border-border px-3 py-2 text-sm'
					onClick={() => printCurrentView()}
				>
					Print preview
				</button>
				{favorites.length > 0 && (
					<span className='rounded-full border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground'>
						Favorites:{' '}
						{favorites.map((report) => report.replaceAll('-', ' ')).join(', ')}
					</span>
				)}
			</div>
			{message && (
				<p className='mb-3 rounded border border-border bg-muted px-3 py-2 text-sm'>
					{message}
				</p>
			)}
			<div className='mb-3 hidden print:block'>
				<h1 className='text-xl font-semibold'>
					FMOH Inventory {type.replaceAll('-', ' ')} report
				</h1>
				<p className='text-sm'>Generated: {new Date().toLocaleString()}</p>
				<p className='text-sm'>Rows: {previewRows.length}</p>
			</div>
			<DataTable
				rows={previewRows}
				empty='Preview a report to see backend data.'
				columns={previewColumns}
			/>
		</Panel>
	)
}

function Panel({
	title,
	description,
	action,
	children,
}: {
	title: string
	description?: string
	action?: React.ReactNode
	children: React.ReactNode
}) {
	const Icon = sectionIcon(title)
	const [helpOpen, setHelpOpen] = useState(false)
	const article = helpForPanel(title)
	return (
		<section className='space-y-3'>
			<div className='flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border bg-[linear-gradient(135deg,rgba(20,184,166,.10),hsl(var(--surface))_52%,rgba(59,130,246,.08))] px-4 py-3 shadow-sm'>
				<div className='flex min-w-0 items-center gap-3'>
					<span className='grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary'>
						<Icon size={20} />
					</span>
					<div className='min-w-0'>
						<h2 className='truncate text-base font-semibold tracking-tight'>
							{title}
						</h2>
						{description && (
							<p className='mt-1 text-sm text-muted-foreground'>
								{description}
							</p>
						)}
					</div>
				</div>
				<div className='flex flex-wrap items-center gap-2'>
					<button
						className='inline-flex items-center gap-2 rounded border border-border bg-background/70 px-3 py-2 text-sm'
						onClick={() => setHelpOpen(true)}
						title='Help. Opens simple instructions for this page.'
					>
						<HelpCircle size={16} /> Help
					</button>
					{action}
				</div>
			</div>
			{children}
			{helpOpen && (
				<ContextHelpPanel
					article={article}
					onClose={() => setHelpOpen(false)}
				/>
			)}
		</section>
	)
}

function helpForPanel(title: string) {
	const lower = title.toLowerCase()
	if (lower.includes('item')) return pageHelp.items
	if (
		lower.includes('receiv') ||
		lower.includes('grn') ||
		lower.includes('inspection')
	)
		return pageHelp.receipts
	if (
		lower.includes('storage') ||
		lower.includes('location') ||
		lower.includes('barcode') ||
		lower.includes('scanner') ||
		lower.includes('batch')
	)
		return pageHelp.storage
	if (lower.includes('bin card')) return pageHelp['bin-card']
	if (
		lower.includes('ledger') ||
		lower.includes('rotation') ||
		lower.includes('monitor')
	)
		return pageHelp.ledger
	if (lower.includes('issue') || lower.includes('issuance'))
		return pageHelp.issues
	if (lower.includes('count') || lower.includes('physical'))
		return pageHelp.counts
	if (lower.includes('adjust') || lower.includes('reconciliation'))
		return pageHelp.adjustments
	if (lower.includes('disposal')) return pageHelp.disposals
	if (lower.includes('report')) return pageHelp.reports
	if (lower.includes('user')) return pageHelp.users
	if (lower.includes('audit')) return pageHelp.audit
	if (lower.includes('config') || lower.includes('master'))
		return pageHelp.master
	return pageHelp.dashboard
}

function SearchBox({
	value,
	onChange,
}: {
	value: string
	onChange: (value: string) => void
}) {
	return (
		<label className='relative block'>
			<Search className='absolute left-3 top-2.5 text-primary' size={16} />
			<input
				className='w-72 rounded-lg border border-border bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--surface-subtle)))] py-2 pl-9 pr-3 text-sm shadow-sm'
				placeholder='Search...'
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
		</label>
	)
}

function LoadingState({ message = 'Loading data...' }: { message?: string }) {
	return (
		<div className='rounded-lg border border-border bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--surface-subtle)))] p-6 text-sm text-muted-foreground shadow-sm'>
			<LoadingInline loading label={message} />
		</div>
	)
}

function ErrorState({ message }: { message: string }) {
	return (
		<div className='rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger shadow-sm'>
			{message}
		</div>
	)
}

function articleToMarkdown(article: HelpArticle) {
	return [
		`# ${article.title}`,
		'',
		`Category: ${article.category}`,
		'',
		article.summary,
		'',
		...(article.body ?? []).map((line) => `- ${line}`),
		'',
		article.related?.length ? `Related: ${article.related.join(', ')}` : '',
		article.next ? `Next step: ${article.next}` : '',
	]
		.filter(Boolean)
		.join('\n')
}

async function exportMarkdown(article: HelpArticle) {
	await saveTextFile(`${article.id}.md`, articleToMarkdown(article), [
		{ name: 'Markdown', extensions: ['md'] },
	])
}

function HelpArticleView({ article }: { article: HelpArticle }) {
	return (
		<article className='space-y-4'>
			<div className='rounded-lg border border-border bg-background/45 p-4'>
				<div className='flex flex-wrap items-start justify-between gap-3'>
					<div>
						<p className='text-xs font-semibold uppercase text-primary'>
							{article.category}
						</p>
						<h3 className='mt-1 text-xl font-semibold'>{article.title}</h3>
						<p className='mt-2 text-sm text-muted-foreground'>
							{article.summary}
						</p>
					</div>
					{article.time && (
						<span className='rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground'>
							{article.time}
						</span>
					)}
				</div>
			</div>
			<div className='grid gap-3'>
				<div className='rounded-lg border border-border bg-background/45 p-4'>
					<p className='text-sm font-semibold'>What happens next?</p>
					<p className='mt-2 text-sm text-muted-foreground'>
						{article.next ??
							'Return to the workflow rail and continue with the next page.'}
					</p>
					{article.related?.length ? (
						<p className='mt-3 text-sm text-muted-foreground'>
							Related pages: {article.related.join(', ')}
						</p>
					) : null}
				</div>
			</div>
			<div className='space-y-2'>
				{article.body.map((line, index) => (
					<div
						key={`${article.id}-${index}`}
						className='flex gap-3 rounded-lg border border-border bg-background/35 p-3 text-sm'
					>
						<span className='grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary'>
							{index + 1}
						</span>
						<p>{line}</p>
					</div>
				))}
			</div>
		</article>
	)
}

function ContextHelpPanel({
	article,
	onClose,
}: {
	article: HelpArticle
	onClose: () => void
}) {
	return (
		<Modal
			title={article.title}
			description='Plain-language help for this screen only.'
			onClose={onClose}
		>
			<div className='mb-4 flex flex-wrap gap-2'>
				<button
					className='inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm'
					onClick={() => printCurrentView()}
				>
					<Printer size={16} /> Print
				</button>
				<button
					className='inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm'
					onClick={() => exportMarkdown(article)}
				>
					<Text size={16} /> Export Markdown
				</button>
			</div>
			<HelpArticleView article={article} />
		</Modal>
	)
}

function HelpCenter({
	initialArticleId = 'quick-start',
}: {
	initialArticleId?: string
}) {
	const [query, setQuery] = useState('')
	const [category, setCategory] = useState('All')
	const [selectedId, setSelectedId] = useState(initialArticleId)
	const [bookmarks, setBookmarks] = useState<string[]>(() =>
		cachedValue('fmoh-help-bookmarks', [])
	)
	const [history, setHistory] = useState<string[]>(() =>
		cachedValue('fmoh-help-history', [])
	)
	const categories = [
		'All',
		...Array.from(new Set(helpArticles.map((article) => article.category))),
	]
	const selected =
		helpArticles.find((article) => article.id === selectedId) ?? helpArticles[0]
	const filtered = helpArticles
		.filter((article) => {
			const haystack =
				`${article.title} ${article.category} ${article.summary} ${article.body.join(' ')}`.toLowerCase()
			const matchesQuery = haystack.includes(query.toLowerCase())
			const matchesCategory =
				category === 'All' || article.category === category
			return matchesQuery && matchesCategory
		})
		.slice(0, 80)
	function selectArticle(id: string) {
		setSelectedId(id)
		const next = [id, ...history.filter((item) => item !== id)].slice(0, 12)
		setHistory(next)
		void writeStoredValue('fmoh-help-history', next)
	}
	function toggleBookmark(id: string) {
		const next = bookmarks.includes(id)
			? bookmarks.filter((item) => item !== id)
			: [...bookmarks, id]
		setBookmarks(next)
		void writeStoredValue('fmoh-help-bookmarks', next)
	}
	useEffect(() => {
		void readStoredValue('fmoh-help-bookmarks', bookmarks).then(setBookmarks)
		void readStoredValue('fmoh-help-history', history).then(setHistory)
	}, [])
	async function exportFullManual() {
		const text = helpArticles.map(articleToMarkdown).join('\n\n---\n\n')
		await saveTextFile('fmoh-inventory-user-manual.md', text, [
			{ name: 'Markdown', extensions: ['md'] },
		])
	}
	return (
		<section className='grid gap-5 xl:grid-cols-[340px_1fr]'>
			<aside className='space-y-3 rounded-lg border border-border bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--surface-subtle)))] p-3 shadow-sm'>
				<label className='relative block'>
					<Search className='absolute left-3 top-2.5 text-primary' size={16} />
					<input
						className='w-full rounded-lg border border-border bg-background/70 py-2 pl-9 pr-3 text-sm'
						placeholder='Ask a question...'
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</label>
				<select
					className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm'
					value={category}
					onChange={(event) => setCategory(event.target.value)}
				>
					{categories.map((item) => (
						<option key={item} value={item}>
							{item}
						</option>
					))}
				</select>
				<div className='grid grid-cols-2 gap-2'>
					<button
						className='inline-flex items-center justify-center gap-2 rounded border border-border px-3 py-2 text-xs'
						onClick={() => printCurrentView()}
					>
						<Printer size={14} /> PDF
					</button>
					<button
						className='inline-flex items-center justify-center gap-2 rounded border border-border px-3 py-2 text-xs'
						onClick={exportFullManual}
					>
						<Text size={14} /> Markdown
					</button>
				</div>
				<div className='max-h-[580px] overflow-y-auto'>
					{filtered.map((article) => (
						<button
							key={article.id}
							className={cn(
								'mb-2 w-full rounded-lg border p-3 text-left text-sm',
								selected.id === article.id
									? 'border-primary/45 bg-primary/10'
									: 'border-border bg-background/45 hover:bg-background/75'
							)}
							onClick={() => selectArticle(article.id)}
						>
							<span className='block truncate font-semibold'>
								{article.title}
							</span>
							<span className='mt-1 block truncate text-xs text-muted-foreground'>
								{article.summary}
							</span>
						</button>
					))}
				</div>
			</aside>
			<main className='min-w-0 space-y-4'>
				<div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-[linear-gradient(135deg,rgba(20,184,166,.12),hsl(var(--surface))_54%,rgba(59,130,246,.10))] p-4 shadow-sm'>
					<div>
						<p className='text-xs font-semibold uppercase text-primary'>
							Built-in trainer
						</p>
						<h2 className='text-2xl font-semibold'>
							Help Center and User Manual
						</h2>
						<p className='mt-1 text-sm text-muted-foreground'>
							{helpArticles.length} searchable articles, including{' '}
							{faqArticles.length} FAQs.
						</p>
					</div>
					<button
						className='inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm'
						onClick={() => toggleBookmark(selected.id)}
					>
						<Bookmark size={16} />{' '}
						{bookmarks.includes(selected.id) ? 'Bookmarked' : 'Bookmark'}
					</button>
				</div>
				{(bookmarks.length > 0 || history.length > 0) && (
					<div className='grid gap-3 md:grid-cols-2'>
						<div className='rounded-lg border border-border bg-background/45 p-3'>
							<p className='text-sm font-semibold'>Bookmarks</p>
							<p className='mt-1 text-xs text-muted-foreground'>
								{bookmarks
									.map(
										(id) =>
											helpArticles.find((article) => article.id === id)?.title
									)
									.filter(Boolean)
									.join(', ') || 'No bookmarks yet.'}
							</p>
						</div>
						<div className='rounded-lg border border-border bg-background/45 p-3'>
							<p className='text-sm font-semibold'>Recent articles</p>
							<p className='mt-1 text-xs text-muted-foreground'>
								{history
									.map(
										(id) =>
											helpArticles.find((article) => article.id === id)?.title
									)
									.filter(Boolean)
									.join(', ') || 'No recent articles yet.'}
							</p>
						</div>
					</div>
				)}
				<HelpArticleView article={selected} />
			</main>
		</section>
	)
}

function GuidedTour({ onClose }: { onClose: () => void }) {
	const [step, setStep] = useState(0)
	useEffect(() => {
		const previousOverflow = document.body.style.overflow
		const previousOverscroll = document.body.style.overscrollBehavior
		document.body.style.overflow = 'hidden'
		document.body.style.overscrollBehavior = 'none'
		return () => {
			document.body.style.overflow = previousOverflow
			document.body.style.overscrollBehavior = previousOverscroll
		}
	}, [])
	const tour = [
		[
			'Sidebar',
			'Use the sidebar to open each work area, such as Items, Receiving, Storage, and Reports.',
		],
		[
			'Dashboard',
			'Start here each day. It shows alerts and work that needs attention.',
		],
		[
			'Search',
			'Press Ctrl+K to search items, suppliers, GRNs, users, reports, and pages.',
		],
		[
			'Notifications',
			'Open notifications to see low stock, pending approvals, and other alerts.',
		],
		[
			'Forms',
			'Fill fields from left to right. Required fields must be complete before saving.',
		],
		[
			'Tables',
			'Use table search, sorting, column controls, and export to find records quickly.',
		],
		[
			'Help',
			'Open Help on any page for simple steps, examples, mistakes, and next workflow actions.',
		],
	]
	const [title, body] = tour[step]
	return (
		<div
			className='fixed inset-0 z-[60] grid h-[100dvh] w-screen place-items-center overflow-hidden bg-black/80 p-4 backdrop-blur-sm overscroll-none'
			onWheel={(event) => event.stopPropagation()}
			onTouchMove={(event) => event.stopPropagation()}
		>
			<section
				className='w-full max-w-xl rounded-lg border border-border bg-[hsl(var(--surface))] p-5 shadow-2xl'
				role='dialog'
				aria-modal='true'
				aria-label='Guided tour'
			>
				<div className='mb-4 flex items-center gap-3'>
					<span className='grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary'>
						<Sparkles size={22} />
					</span>
					<div>
						<p className='text-xs font-semibold uppercase text-primary'>
							Guided walkthrough
						</p>
						<h2 className='text-xl font-semibold'>{title}</h2>
					</div>
				</div>
				<p className='text-sm text-muted-foreground'>{body}</p>
				<div className='mt-5 flex flex-wrap items-center justify-between gap-3'>
					<span className='rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-semibold'>
						{step + 1} of {tour.length}
					</span>
					<div className='flex gap-2'>
						<button
							className='rounded border border-border px-3 py-2 text-sm'
							onClick={onClose}
						>
							Skip
						</button>
						{step > 0 && (
							<button
								className='rounded border border-border px-3 py-2 text-sm'
								onClick={() => setStep((current) => current - 1)}
							>
								Back
							</button>
						)}
						<button
							className='rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground'
							onClick={() =>
								step >= tour.length - 1
									? onClose()
									: setStep((current) => current + 1)
							}
						>
							{step >= tour.length - 1 ? 'Finish' : 'Next'}
						</button>
					</div>
				</div>
			</section>
		</div>
	)
}

function HelpSuggestion({
	view,
	onOpenHelp,
}: {
	view: string
	onOpenHelp: () => void
}) {
	const [visible, setVisible] = useState(false)
	useEffect(() => {
		setVisible(false)
		const timer = window.setTimeout(() => setVisible(true), 45000)
		return () => window.clearTimeout(timer)
	}, [view])
	if (!visible) return null
	const title = pageHelp[view]?.title ?? 'Need help?'
	return (
		<div className='fixed bottom-4 right-4 z-40 max-w-sm rounded-lg border border-border bg-[hsl(var(--surface))] p-4 shadow-2xl'>
			<p className='text-sm font-semibold'>Need help on this page?</p>
			<p className='mt-1 text-sm text-muted-foreground'>
				Open {title} for simple steps and common mistakes.
			</p>
			<div className='mt-3 flex gap-2'>
				<button
					className='rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground'
					onClick={onOpenHelp}
				>
					Open guide
				</button>
				<button
					className='rounded border border-border px-3 py-2 text-sm'
					onClick={() => setVisible(false)}
				>
					Not now
				</button>
			</div>
		</div>
	)
}

type NavItem = {
	id: AppView
	label: string
	icon: React.ComponentType<{ size?: number; className?: string }>
	show: boolean
	badge?: number
	keywords?: string
}

const workflowSteps: Array<{
	label: string
	view: AppView
	icon: React.ComponentType<{ size?: number; className?: string }>
}> = [
	{ label: 'Login', view: 'dashboard', icon: ShieldCheck },
	{ label: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
	{ label: 'Item Registration', view: 'items', icon: Boxes },
	{ label: 'Procurement / Donation', view: 'receipts', icon: CircleDollarSign },
	{ label: 'Goods Receiving (GRN)', view: 'receipts', icon: PackagePlus },
	{ label: 'Inspector Portal (QA)', view: 'inspection', icon: PackageSearch },
	{ label: 'Storage & Coding', view: 'storage', icon: MapPin },
	{ label: 'Approver Portal', view: 'approvals', icon: ShieldCheck },
	{ label: 'Stock Issue (Model 22)', view: 'issues', icon: PackageCheck },
	{ label: 'Returned Items', view: 'returns', icon: Recycle },
	{ label: 'Stock Rotation (FIFO / FEFO)', view: 'ledger', icon: TimerReset },
	{ label: 'Inventory Monitoring', view: 'ledger', icon: Gauge },
	{ label: 'Bin Card', view: 'bin-card', icon: ClipboardCheck },
	{ label: 'Physical Inventory Count', view: 'counts', icon: ClipboardCheck },
	{ label: 'Stock Reconciliation', view: 'adjustments', icon: Recycle },
	{ label: 'Disposal Management', view: 'disposals', icon: Recycle },
	{ label: 'Reports', view: 'reports', icon: FileDown },
	{ label: 'User Management', view: 'users', icon: Users },
	{ label: 'Analytics Dashboard', view: 'dashboard', icon: BarChart3 },
]

function WorkflowRail({
	view,
	availableViews,
	onNavigate,
}: {
	view: AppView
	availableViews: AppView[]
	onNavigate: (view: AppView) => void
}) {
	const visibleSteps = workflowSteps.filter((step) =>
		availableViews.includes(step.view)
	)
	const activeIndex = Math.max(
		0,
		visibleSteps.findIndex((step) => step.view === view)
	)
	return (
		<section className='mb-5 overflow-hidden rounded-lg border border-border bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--surface-subtle)))] shadow-sm'>
			<div className='flex items-center justify-between gap-3 border-b border-border px-4 py-3'>
				<div className='flex min-w-0 items-center gap-3'>
					<span className='grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary'>
						<Sparkles size={18} />
					</span>
					<div className='min-w-0'>
						<h2 className='truncate text-sm font-semibold'>
							Inventory workflow
						</h2>
						<p className='truncate text-xs text-muted-foreground'>
							Previous, current, and next steps stay visible across modules.
						</p>
					</div>
				</div>
				<span className='rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground'>
					{activeIndex + 1} / {visibleSteps.length}
				</span>
			</div>
			<div
				className='workflow-scroll flex gap-2 overflow-x-auto p-3'
				role='list'
				aria-label='Inventory workflow'
			>
				{visibleSteps.map((step, index) => {
					const Icon = step.icon
					const state =
						index < activeIndex
							? 'complete'
							: index === activeIndex
								? 'active'
								: 'next'
					return (
						<button
							key={`${step.label}-${index}`}
							role='listitem'
							onClick={() => onNavigate(step.view)}
							className={cn(
								'workflow-step min-w-[172px] rounded-lg border px-3 py-2 text-left transition',
								state === 'active'
									? 'border-primary/45 bg-primary/10 text-foreground shadow-sm'
									: state === 'complete'
										? 'border-emerald-500/20 bg-emerald-500/10 text-muted-foreground'
										: 'border-border bg-background/45 text-muted-foreground hover:bg-background/75'
							)}
						>
							<span className='flex items-center gap-2'>
								<span
									className={cn(
										'grid h-8 w-8 place-items-center rounded-lg',
										state === 'active'
											? 'bg-primary text-primary-foreground'
											: state === 'complete'
												? 'bg-emerald-500/15 text-emerald-400'
												: 'bg-background text-primary'
									)}
								>
									<Icon size={16} />
								</span>
								<span className='text-[11px] font-semibold uppercase'>
									Step {index + 1}
								</span>
							</span>
							<span className='mt-2 block text-xs font-semibold leading-snug'>
								{step.label}
							</span>
						</button>
					)
				})}
			</div>
		</section>
	)
}

function NotificationCenter({ token }: { token: string }) {
	const [open, setOpen] = useState(false)
	const [items, setItems] = useState<any[]>([])
	useEffect(() => {
		request<any[]>('/notifications', token)
			.then(setItems)
			.catch(() => setItems([]))
	}, [token])
	const unread = items.filter((item) => !item.readAt).length
	return (
		<div className='relative'>
			<button
				aria-label='Open notification center'
				className='relative rounded-lg border border-border bg-background/70 p-2 shadow-sm hover:bg-[hsl(var(--surface-subtle))]'
				onClick={() => setOpen((current) => !current)}
			>
				<Bell size={18} />
				{unread > 0 && (
					<span className='absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white'>
						{unread}
					</span>
				)}
			</button>
			{open && (
				<div className='absolute right-0 z-40 mt-2 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-[hsl(var(--surface))] shadow-2xl'>
					<div className='flex items-center justify-between border-b border-border bg-primary/10 px-4 py-3'>
						<div>
							<p className='text-sm font-semibold'>Notification center</p>
							<p className='text-xs text-muted-foreground'>
								{unread} actionable alerts
							</p>
						</div>
						<button
							className='rounded-md border border-border bg-background/70 px-2 py-1 text-xs'
							onClick={() => setOpen(false)}
						>
							Close
						</button>
					</div>
					<div className='max-h-[420px] overflow-y-auto p-2'>
						{items.length === 0 ? (
							<div className='rounded-lg border border-dashed border-border bg-background/45 p-5 text-sm text-muted-foreground'>
								No active notifications.
							</div>
						) : (
							items.slice(0, 10).map((item, index) => (
								<div
									key={
										item.id ??
										`${item.type ?? 'notification'}-${item.title ?? 'untitled'}-${index}`
									}
									className='mb-2 rounded-lg border border-border bg-background/55 p-3'
								>
									<div className='flex items-start gap-3'>
										<span className='mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-400'>
											<AlertTriangle size={16} />
										</span>
										<div className='min-w-0'>
											<p className='truncate text-sm font-semibold'>
												{item.title}
											</p>
											<p className='mt-1 text-xs text-muted-foreground'>
												{item.message}
											</p>
											<StatusPill value={item.type} />
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	)
}

function GlobalSearch({
	token,
	user,
	nav,
	open,
	onClose,
	onNavigate,
}: {
	token: string
	user: User
	nav: NavItem[]
	open: boolean
	onClose: () => void
	onNavigate: (view: AppView) => void
}) {
	const [query, setQuery] = useState('')
	const [records, setRecords] = useState<
		Array<{ label: string; detail: string; view: AppView; type: string }>
	>([])
	useEffect(() => {
		if (!open) return
		const next = nav.map((item) => ({
			label: item.label,
			detail: item.keywords ?? 'Open module',
			view: item.id,
			type: 'Module',
		}))
		const jobs = [
			canAccessView('items', user)
				? request<any>('/items?pageSize=20&active=true', token)
				: Promise.resolve(null),
			canAccessView('receipts', user)
				? request<any[]>('/receipts', token)
				: Promise.resolve(null),
			canAccessView('storage', user) || canAccessView('receipts', user)
				? request<any>('/master-data', token)
				: Promise.resolve(null),
			canAccessView('users', user)
				? request<any[]>('/admin/users', token)
				: Promise.resolve(null),
		]
		Promise.allSettled(jobs).then(
			([itemsResult, receiptsResult, masterResult, usersResult]) => {
				if (itemsResult.status === 'fulfilled') {
					next.push(
						...(itemsResult.value?.items ?? []).map((item: any) => ({
							label: item.description,
							detail: item.code,
							view: 'items' as AppView,
							type: 'Item',
						}))
					)
				}
				if (receiptsResult.status === 'fulfilled') {
					next.push(
						...(receiptsResult.value ?? []).map((row: any) => ({
							label: row.grnNumber,
							detail: row.supplierDonor?.name ?? 'Goods receiving note',
							view: 'receipts' as AppView,
							type: 'GRN',
						}))
					)
				}
				if (masterResult.status === 'fulfilled') {
					if (canAccessView('receipts', user))
						next.push(
							...(masterResult.value?.supplierDonors ?? []).map((row: any) => ({
								label: row.name,
								detail: row.type ?? 'Supplier / donor',
								view: 'receipts' as AppView,
								type: 'Supplier',
							}))
						)
					if (canAccessView('storage', user))
						next.push(
							...(masterResult.value?.storageLocations ?? []).map(
								(row: any) => ({
									label: row.locationCode,
									detail: `${row.store?.name ?? 'Warehouse'} shelf ${row.shelfNumber}`,
									view: 'storage' as AppView,
									type: 'Warehouse',
								})
							)
						)
				}
				if (usersResult.status === 'fulfilled') {
					next.push(
						...(usersResult.value ?? []).map((row: any) => ({
							label: row.fullName,
							detail: row.email,
							view: 'users' as AppView,
							type: 'User',
						}))
					)
				}
				if (canAccessView('reports', user))
					next.push(
						...reportsForRole(user.role).map((report) => ({
							label: report.replaceAll('-', ' '),
							detail: 'Report preview and export',
							view: 'reports' as AppView,
							type: 'Report',
						}))
					)
				setRecords(next)
			}
		)
	}, [nav, open, token, user])
	useEffect(() => {
		if (!open) return
		const previousOverflow = document.body.style.overflow
		const previousOverscroll = document.body.style.overscrollBehavior
		document.body.style.overflow = 'hidden'
		document.body.style.overscrollBehavior = 'none'
		return () => {
			document.body.style.overflow = previousOverflow
			document.body.style.overscrollBehavior = previousOverscroll
		}
	}, [open])
	if (!open) return null
	const filtered = records
		.filter((record) =>
			`${record.label} ${record.detail} ${record.type}`
				.toLowerCase()
				.includes(query.toLowerCase())
		)
		.slice(0, 12)
	return (
		<div
			className='fixed inset-0 z-50 h-[100dvh] w-screen overflow-hidden bg-black/80 p-4 backdrop-blur-sm overscroll-none'
			role='dialog'
			aria-modal='true'
			aria-label='Global search'
			onWheel={(event) => event.stopPropagation()}
			onTouchMove={(event) => event.stopPropagation()}
		>
			<div className='mx-auto mt-[8vh] max-w-3xl overflow-hidden rounded-lg border border-border bg-[hsl(var(--surface))] shadow-2xl'>
				<div className='flex items-center gap-3 border-b border-border px-4 py-3'>
					<Command className='text-primary' size={20} />
					<input
						autoFocus
						className='h-12 flex-1 border-0 bg-transparent text-base outline-none'
						placeholder='Search items, suppliers, warehouses, GRNs, users, reports...'
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
					<button
						className='rounded-md border border-border bg-background/70 px-3 py-1.5 text-xs font-semibold'
						onClick={onClose}
					>
						Close
					</button>
				</div>
				<div className='max-h-[520px] overflow-y-auto p-2'>
					{filtered.map((record, index) => (
						<button
							key={`${record.type}-${record.label}-${index}`}
							className='flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left hover:bg-background/70'
							onClick={() => {
								onNavigate(record.view)
								onClose()
							}}
						>
							<span className='min-w-0'>
								<span className='block truncate text-sm font-semibold'>
									{record.label}
								</span>
								<span className='block truncate text-xs text-muted-foreground'>
									{record.detail}
								</span>
							</span>
							<span className='rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground'>
								{record.type}
							</span>
						</button>
					))}
					{filtered.length === 0 && (
						<div className='rounded-lg border border-dashed border-border bg-background/45 p-8 text-center text-sm text-muted-foreground'>
							No matching records.
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

function DesktopSettings() {
	const [status, setStatus] = useState<DesktopStatus>()
	const [message, setMessage] = useState('')
	const [loading, setLoading] = useState('')
	const load = async () => {
		setLoading('status')
		try {
			setStatus(await getDesktopStatus())
		} catch (err) {
			const message = errorMessage(err, 'Unable to read desktop status.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoading('')
		}
	}
	useEffect(() => {
		void load()
	}, [])
	async function backup() {
		setLoading('backup')
		try {
			const path = await createDesktopBackup()
			setMessage(`Backup created: ${path}`)
			notify('success', 'Database backup completed.')
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to create backup.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoading('')
		}
	}
	async function restore() {
		setLoading('restore')
		try {
			const source = await pickDatabaseBackupFile()
			if (!source) return
			const path = await restoreDesktopBackup(source)
			setMessage(`Database restored to: ${path}`)
			notify(
				'success',
				'Database restore completed. Restart the app before continuing inventory work.'
			)
			await load()
		} catch (err) {
			const message = errorMessage(err, 'Unable to restore backup.')
			setMessage(message)
			notify('error', message)
		} finally {
			setLoading('')
		}
	}
	return (
		<section className='space-y-5'>
			<Panel
				title='Desktop Settings'
				description='Native desktop runtime, SQLite storage, backups, restore, and local diagnostics.'
			>
				<div className='grid gap-3 md:grid-cols-3'>
					<Stat
						label='Runtime'
						value={isDesktop() ? 'Tauri' : 'Browser'}
						description='Native desktop APIs are active inside the packaged app.'
						icon={Gauge}
						tone='info'
					/>
					<Stat
						label='SQLite'
						value={status?.database_exists ? 'Available' : 'Missing'}
						description={status?.integrity ?? 'Checking database status'}
						icon={Database}
						tone={status?.database_exists ? 'success' : 'warning'}
					/>
					<Stat
						label='Database Size'
						value={`${Math.round((status?.database_size_bytes ?? 0) / 1024)} KB`}
						description='Stored in the application data directory.'
						icon={HardDrive}
						tone='default'
					/>
					<Stat
						label='Local API'
						value={status?.backend_started ? 'Running' : 'Stopped'}
						description={status?.api_url ?? 'http://127.0.0.1:3001'}
						icon={Activity}
						tone={status?.backend_started ? 'success' : 'warning'}
					/>
				</div>
				<div className='mt-4 grid gap-3 rounded border border-border bg-background/35 p-4 text-sm'>
					<div>
						<span className='text-muted-foreground'>
							Application data directory
						</span>
						<br />
						<span className='break-all'>
							{status?.app_data_dir ?? 'Loading...'}
						</span>
					</div>
					<div>
						<span className='text-muted-foreground'>SQLite database file</span>
						<br />
						<span className='break-all'>
							{status?.database_path ?? 'Loading...'}
						</span>
					</div>
					<div>
						<span className='text-muted-foreground'>Backup folder</span>
						<br />
						<span className='break-all'>
							{status?.backup_dir ?? 'Loading...'}
						</span>
					</div>
				</div>
				<div className='mt-4 flex flex-wrap gap-2'>
					<button
						className='inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm'
						onClick={load}
						disabled={loading === 'status'}
					>
						<Gauge size={16} />{' '}
						<LoadingInline
							loading={loading === 'status'}
							label='Refresh status'
							loadingLabel='Checking...'
						/>
					</button>
					<button
						className='inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm'
						onClick={backup}
						disabled={loading === 'backup'}
					>
						<Download size={16} />{' '}
						<LoadingInline
							loading={loading === 'backup'}
							label='Manual backup'
							loadingLabel='Backing up...'
						/>
					</button>
					<button
						className='inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm'
						onClick={restore}
						disabled={loading === 'restore'}
					>
						<Upload size={16} />{' '}
						<LoadingInline
							loading={loading === 'restore'}
							label='Restore backup'
							loadingLabel='Restoring...'
						/>
					</button>
				</div>
				{message && (
					<p className='mt-4 rounded border border-border bg-muted px-3 py-2 text-sm'>
						{message}
					</p>
				)}
			</Panel>
		</section>
	)
}

function LicenseGate({
	status,
	onChanged,
}: {
	status: LicenseStatus
	onChanged: (status: LicenseStatus) => void
}) {
	const [key, setKey] = useState('')
	const [message, setMessage] = useState(status.message)
	const [loading, setLoading] = useState(false)
	const expiry = new Date(status.expires_at * 1000).toLocaleDateString()
	async function activate(event: React.FormEvent) {
		event.preventDefault()
		setLoading(true)
		try {
			const next = await activateLicense(key || status.license_key)
			onChanged(next)
			setMessage(next.message)
		} catch (err) {
			setMessage(errorMessage(err, 'Unable to activate license.'))
		} finally {
			setLoading(false)
		}
	}
	async function deactivate() {
		setLoading(true)
		try {
			const next = await deactivateCurrentDevice()
			onChanged(next)
			setMessage(next.message)
		} catch (err) {
			setMessage(errorMessage(err, 'Unable to deactivate this device.'))
		} finally {
			setLoading(false)
		}
	}
	return (
		<main className='grid min-h-screen place-items-center bg-[hsl(var(--background))] p-6'>
			<section className='w-full max-w-xl rounded-lg border border-border bg-[linear-gradient(135deg,hsl(var(--surface)),hsl(var(--surface-subtle)))] p-6 shadow-xl'>
				<div className='mb-5 flex items-center gap-3'>
					<span className='grid h-12 w-12 place-items-center rounded-lg bg-danger/10 text-danger'>
						<ShieldCheck size={24} />
					</span>
					<div>
						<p className='text-xs font-semibold uppercase text-danger'>
							License Expired
						</p>
						<h1 className='text-xl font-semibold'>
							Renew FMOH Inventory License
						</h1>
					</div>
				</div>
				<div className='grid gap-2 rounded border border-border bg-background/45 p-3 text-sm'>
					<div>
						<span className='text-muted-foreground'>Expiration date</span>
						<br />
						{expiry}
					</div>
					<div>
						<span className='text-muted-foreground'>Current device</span>
						<br />
						{status.current_device_id}
					</div>
					<div>
						<span className='text-muted-foreground'>Activated devices</span>
						<br />
						{status.activated_devices.length} of {status.max_devices}
					</div>
				</div>
				<p className='mt-4 text-sm text-muted-foreground'>
					Normal operational functionality is locked until renewal. Existing
					inventory data, backups, and records are preserved.
				</p>
				<form onSubmit={activate} className='mt-4 grid gap-3'>
					<input
						className='rounded border border-border bg-background px-3 py-2 text-sm'
						placeholder='Activation or renewal code'
						value={key}
						onChange={(event) => setKey(event.target.value)}
					/>
					<button disabled={loading} className='primary-action-button w-full'>
						<LoadingInline
							loading={loading}
							label='Activate / Renew'
							loadingLabel='Activating...'
						/>
					</button>
				</form>
				<button
					className='mt-3 rounded border border-border px-3 py-2 text-sm'
					disabled={loading}
					onClick={deactivate}
				>
					Deactivate this device
				</button>
				{message && (
					<p className='mt-4 rounded border border-border bg-muted px-3 py-2 text-sm'>
						{message}
					</p>
				)}
			</section>
		</main>
	)
}

function DesktopStartupGate({ children }: { children: React.ReactNode }) {
	const [status, setStatus] = useState<DesktopStatus | null>(
		isDesktop() ? null : ({ backend_started: true } as DesktopStatus)
	)
	const [checks, setChecks] = useState(0)

	useEffect(() => {
		if (!isDesktop() || status?.backend_started) return
		let cancelled = false
		const check = () => {
			void getDesktopStatus()
				.then((next) => {
					if (!cancelled) {
						setStatus(next)
						setChecks((current) => current + 1)
					}
				})
				.catch((error) => {
					if (!cancelled) {
						setStatus((current) => ({
							...(current ?? ({} as DesktopStatus)),
							backend_started: false,
							backend_error: errorMessage(
								error,
								'Unable to check the local service.'
							),
						}))
						setChecks((current) => current + 1)
					}
				})
		}
		check()
		const timer = window.setInterval(check, 900)
		return () => {
			cancelled = true
			window.clearInterval(timer)
		}
	}, [status?.backend_started])

	if (!isDesktop() || status?.backend_started) return <>{children}</>

	const initializing = Boolean(status?.database_initializing)
	const stalled =
		Boolean(status?.backend_error) || (checks > 180 && !initializing)
	return (
		<main className='desktop-startup-screen'>
			<section className='desktop-startup-panel'>
				<div className='desktop-startup-mark' aria-hidden='true'>
					<Boxes size={30} />
					<span />
				</div>
				<div>
					<p className='text-xs font-semibold uppercase text-muted-foreground'>
						FMOH Inventory
					</p>
					<h1 className='mt-2 text-2xl font-semibold'>
						{stalled
							? 'Local service needs attention'
							: 'Starting secure inventory workspace'}
					</h1>
					<p className='mt-2 text-sm text-muted-foreground'>
						{stalled
							? 'The app window is staying open so the problem can be seen and fixed.'
							: initializing
								? 'Preparing the local inventory database. This can take a minute after installing an update.'
								: 'Preparing database, reports, and offline inventory services.'}
					</p>
				</div>
				<div className='desktop-startup-progress' aria-hidden='true'>
					<span />
				</div>
				{stalled && (
					<p className='rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger'>
						{status?.backend_error ??
							'The local service did not become ready in time. Restart the app and try again.'}
					</p>
				)}
				{stalled && (
					<button
						className='primary-action-button'
						onClick={() => {
							setChecks(0)
							setStatus(null)
						}}
					>
						Check again
					</button>
				)}
			</section>
		</main>
	)
}

function App() {
	useSmartTooltips()
	const [session, setSession] = useState<Session | null>(() =>
		cachedValue<Session | null>('fmoh-session', null)
	)
	const [authReady, setAuthReady] = useState(
		() => !cachedValue<Session | null>('fmoh-session', null)
	)
	const [theme, setTheme] = useState(() => cachedValue('theme', 'light'))
	const [view, setView] = useState<AppView>('dashboard')
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
	const [navSearch, setNavSearch] = useState('')
	const [commandOpen, setCommandOpen] = useState(false)
	const [tourOpen, setTourOpen] = useState(
		() => cachedValue<boolean>('fmoh-help-tour-complete', false) !== true
	)
	const [pageHelpOpen, setPageHelpOpen] = useState(false)
	const [license, setLicense] = useState<LicenseStatus>()
	const navigate = (nextView: AppView) => {
		if (!session || canAccessView(nextView, session.user)) {
			setView(nextView)
			return
		}
		notify('warning', 'Your role cannot open that workspace.')
		setView(defaultViewForRole(session.user))
	}

	useEffect(() => {
		document.documentElement.classList.toggle('dark', theme === 'dark')
		void writeStoredValue('theme', theme)
	}, [theme])
	useEffect(() => {
		void readStoredValue<Session | null>('fmoh-session', session).then(
			setSession
		)
		void readStoredValue('theme', theme).then(setTheme)
		void readStoredValue('fmoh-help-tour-complete', !tourOpen).then(
			(complete) => setTourOpen(!complete)
		)
		void getLicenseStatus()
			.then(setLicense)
			.catch(() => undefined)
	}, [])
	useEffect(() => {
		if (!session?.accessToken) {
			setAuthReady(true)
			return
		}
		let cancelled = false
		setAuthReady(false)
		request<User>('/auth/me', session.accessToken)
			.then((user) => {
				if (cancelled) return
				const refreshed = { accessToken: session.accessToken, user }
				setSession(refreshed)
				void writeStoredValue('fmoh-session', refreshed)
				if (!canAccessView(view, user)) setView(defaultViewForRole(user))
			})
			.catch(() => {
				if (cancelled) return
				void deleteStoredValue('fmoh-session')
				setSession(null)
				notify(
					'warning',
					'Please sign in again so your current role permissions can be loaded.'
				)
			})
			.finally(() => {
				if (!cancelled) setAuthReady(true)
			})
		return () => {
			cancelled = true
		}
	}, [session?.accessToken])
	useEffect(() => {
		const onAuthExpired = () => {
			setSession(null)
			notify('warning', 'Session expired. Please sign in again.')
		}
		window.addEventListener('fmoh-auth-expired', onAuthExpired)
		return () => window.removeEventListener('fmoh-auth-expired', onAuthExpired)
	}, [])
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault()
				setCommandOpen(true)
			} else if (
				(event.ctrlKey || event.metaKey) &&
				event.key.toLowerCase() === 'p'
			) {
				event.preventDefault()
				void printCurrentView()
			} else if (
				(event.ctrlKey || event.metaKey) &&
				event.key.toLowerCase() === 'h'
			) {
				event.preventDefault()
				navigate('help')
			} else if (
				(event.ctrlKey || event.metaKey) &&
				event.key.toLowerCase() === 'b'
			) {
				event.preventDefault()
				navigate('settings')
			} else if (event.key === 'F1') {
				event.preventDefault()
				setPageHelpOpen(true)
			} else if (event.key === 'F11') {
				event.preventDefault()
				void toggleFullscreen()
			}
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [session])
	useEffect(() => {
		let unlisten: (() => void) | undefined
		void listenDesktopMenu((id) => {
			if (id === 'print') void printCurrentView()
			else if (id === 'fullscreen') void toggleFullscreen()
			else if (id === 'search') setCommandOpen(true)
			else if (id === 'help') navigate('help')
			else if (id === 'settings' || id === 'backup' || id === 'restore')
				navigate('settings')
			else if (id === 'items') navigate('items')
			else if (id === 'file-import-items') {
				navigate('items')
				window.setTimeout(
					() => window.dispatchEvent(new CustomEvent('fmoh-import-items')),
					150
				)
			} else if (id === 'receiving') navigate('receipts')
			else if (id === 'storage') navigate('storage')
			else if (id === 'issue') navigate('issues')
			else if (id === 'reports' || id === 'export') navigate('reports')
		}).then((cleanup) => {
			unlisten = cleanup
		})
		return () => unlisten?.()
	}, [session])

	const nav = useMemo(() => {
		if (!session) return []
		const items: Record<AppView, NavItem> = {
			dashboard: {
				id: 'dashboard',
				label: 'Dashboard',
				icon: LayoutDashboard,
				show: true,
				keywords: 'analytics executive monitoring KPI',
			},
			items: {
				id: 'items',
				label: 'Item Registration',
				icon: Boxes,
				show: true,
				keywords: 'item master catalog stock',
			},
			receipts: {
				id: 'receipts',
				label: 'Procurement / GRN',
				icon: PackagePlus,
				show: true,
				keywords: 'procurement donation goods receiving inspection acceptance',
			},
			storage: {
				id: 'storage',
				label: 'Storage & Coding',
				icon: MapPin,
				show: true,
				keywords: 'warehouse shelf bin barcode qr',
			},
			ledger: {
				id: 'ledger',
				label: 'Stock Rotation',
				icon: TimerReset,
				show: true,
				keywords: 'ledger fifo fefo monitoring availability',
			},
			'bin-card': {
				id: 'bin-card',
				label: 'Bin Card',
				icon: ClipboardCheck,
				show: true,
				keywords:
					'bin card item transaction history provider department stock balance',
			},
			issues: {
				id: 'issues',
				label: 'Stock Issue',
				icon: PackageCheck,
				show: true,
				keywords: 'department request approval voucher model 22',
			},
			returns: {
				id: 'returns',
				label: 'Returned Items',
				icon: Recycle,
				show: true,
				keywords: 'returns returned items return voucher inspection holding restock',
			},
			approvals: {
				id: 'approvals',
				label: 'Approver Portal',
				icon: ShieldCheck,
				show: true,
				keywords: 'approval approvals workflow authorize issue adjustment disposal',
			},
			inspection: {
				id: 'inspection',
				label: 'Inspector Portal',
				icon: PackageSearch,
				show: true,
				keywords: 'inspect inspection returns returned items qa quality condition check restock',
			},
			counts: {
				id: 'counts',
				label: 'Physical Count',
				icon: ClipboardCheck,
				show: true,
				keywords: 'inventory count worksheet',
			},
			adjustments: {
				id: 'adjustments',
				label: 'Reconciliation',
				icon: ClipboardCheck,
				show: true,
				keywords: 'variance adjustment approval',
			},
			disposals: {
				id: 'disposals',
				label: 'Disposal',
				icon: Recycle,
				show: true,
				keywords: 'obsolete expired damaged disposal',
			},
			reports: {
				id: 'reports',
				label: 'Reports',
				icon: FileDown,
				show: true,
				keywords: 'pdf excel export preview',
			},
			help: {
				id: 'help',
				label: 'Help Center',
				icon: BookOpen,
				show: true,
				keywords: 'manual guide faq troubleshooting shortcuts trainer',
			},
			settings: {
				id: 'settings',
				label: 'Desktop Settings',
				icon: SlidersHorizontal,
				show: true,
				keywords: 'backup restore sqlite database logs desktop native',
			},
			master: {
				id: 'master',
				label: 'Configuration',
				icon: Database,
				show: true,
				keywords: 'master data departments suppliers stores',
			},
			audit: {
				id: 'audit',
				label: 'Audit Logs',
				icon: History,
				show: true,
				keywords: 'activity trail history',
			},
			users: {
				id: 'users',
				label: 'User Management',
				icon: Users,
				show: true,
				keywords: 'roles permissions accounts',
			},
		}
		return roleNavViews[session.user.role]
			.filter((id) => canAccessView(id, session.user))
			.map((id) => items[id])
	}, [session])
	const filteredNav = useMemo(() => {
		const normalized = navSearch.trim().toLowerCase()
		if (!normalized) return nav
		return nav.filter((item) =>
			`${item.label} ${item.keywords ?? ''}`.toLowerCase().includes(normalized)
		)
	}, [nav, navSearch])

	if (license?.expired)
		return (
			<>
				<ToastViewport />
				<DesktopStartupGate>
					<LicenseGate status={license} onChanged={setLicense} />
				</DesktopStartupGate>
			</>
		)
	if (!authReady)
		return (
			<>
				<ToastViewport />
				<DesktopStartupGate>
					<LoadingState message='Refreshing role permissions...' />
				</DesktopStartupGate>
			</>
		)
	if (!session)
		return (
			<>
				<ToastViewport />
				<DesktopStartupGate>
					<Login onLogin={setSession} />
				</DesktopStartupGate>
			</>
		)

	const logout = () => {
		void deleteStoredValue('fmoh-session')
		setSession(null)
	}
	const closeTour = () => {
		void writeStoredValue('fmoh-help-tour-complete', true)
		setTourOpen(false)
	}
	const currentView = canAccessView(view, session.user)
		? view
		: defaultViewForRole(session.user)
	const availableViews = nav.map((item) => item.id)

	return (
		<DesktopStartupGate>
			<div className='flex min-h-screen w-full overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,.10),transparent_30%),hsl(var(--background))]'>
				<ToastViewport />
				{tourOpen && <GuidedTour onClose={closeTour} />}
				<GlobalSearch
					token={session.accessToken}
					user={session.user}
					nav={nav}
					open={commandOpen}
					onClose={() => setCommandOpen(false)}
					onNavigate={navigate}
				/>
				{pageHelpOpen && (
					<ContextHelpPanel
						article={pageHelp[currentView] ?? pageHelp.dashboard}
						onClose={() => setPageHelpOpen(false)}
					/>
				)}
				<aside
					className={cn(
						'hidden shrink-0 border-r border-border bg-[linear-gradient(180deg,hsl(var(--surface)),hsl(var(--surface-subtle)))] p-3 shadow-sm transition-[width] duration-300 lg:block',
						sidebarCollapsed ? 'w-[84px]' : 'w-72'
					)}
				>
					<div className='mb-4 rounded-lg border border-border bg-background/45 p-3'>
						<div className='flex items-center gap-3'>
							<span className='grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary'>
								<Boxes size={21} />
							</span>
							{!sidebarCollapsed && (
								<div className='min-w-0'>
									<p className='truncate text-lg font-semibold'>
										FMOH Inventory
									</p>
									<p className='text-xs text-muted-foreground'>
										{roleLabels[session.user.role]}
									</p>
								</div>
							)}
						</div>
					</div>
					<div className='mb-3 flex items-center gap-2'>
						{!sidebarCollapsed && (
							<label className='relative block flex-1'>
								<Search
									className='absolute left-3 top-2.5 text-primary'
									size={15}
								/>
								<input
									className='w-full rounded-lg border border-border bg-background/70 py-2 pl-9 pr-3 text-sm'
									placeholder='Search modules'
									value={navSearch}
									onChange={(event) => setNavSearch(event.target.value)}
								/>
							</label>
						)}
						<button
							className='rounded-lg border border-border bg-background/70 p-2 shadow-sm'
							aria-label={
								sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
							}
							onClick={() => setSidebarCollapsed((current) => !current)}
						>
							{sidebarCollapsed ? (
								<PanelLeftOpen size={18} />
							) : (
								<PanelLeftClose size={18} />
							)}
						</button>
					</div>
					<nav className='space-y-1' aria-label='Primary modules'>
						{filteredNav.map((item) => {
							const Icon = item.icon
							return (
								<button
									key={item.id}
									title={item.label}
									onClick={() => navigate(item.id)}
									className={cn(
										'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition',
										currentView === item.id
											? 'bg-[linear-gradient(135deg,hsl(var(--primary)),#3b82f6)] text-primary-foreground shadow-sm'
											: 'text-muted-foreground hover:bg-background/55 hover:text-foreground'
									)}
								>
									<span
										className={cn(
											'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition',
											currentView === item.id
												? 'bg-white/18 text-primary-foreground'
												: 'bg-background/55 text-primary group-hover:bg-primary/10'
										)}
									>
										<Icon size={17} />
									</span>
									{!sidebarCollapsed && (
										<span className='min-w-0 flex-1 truncate'>
											{item.label}
										</span>
									)}
									{!sidebarCollapsed && item.badge ? (
										<span className='rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white'>
											{item.badge}
										</span>
									) : null}
								</button>
							)
						})}
					</nav>
				</aside>
				<div className='min-w-0 flex-1'>
					<header className='sticky top-0 z-20 flex items-center justify-between border-b border-border bg-[hsl(var(--surface))]/88 px-4 py-3 shadow-sm backdrop-blur'>
						<div className='flex min-w-0 items-center gap-3'>
							<span className='grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary'>
								<Users size={18} />
							</span>
							<div className='min-w-0'>
								<p className='truncate font-medium'>{session.user.fullName}</p>
								<p className='truncate text-xs text-muted-foreground'>
									{session.user.email}
								</p>
							</div>
						</div>
						<div className='flex items-center gap-2'>
							<button
								className='inline-flex items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2 text-sm shadow-sm'
								onClick={() => setPageHelpOpen(true)}
								title='Help. Opens instructions for the current page.'
							>
								<HelpCircle size={16} /> Help
							</button>
							<button
								className='hidden items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2 text-sm shadow-sm xl:inline-flex'
								onClick={() => setTourOpen(true)}
								title='Replay tour. Shows the main parts of the app.'
							>
								<Sparkles size={16} /> Tour
							</button>
							<button
								className='hidden min-w-[220px] items-center justify-between gap-3 rounded-lg border border-border bg-background/70 px-3 py-2 text-left text-sm text-muted-foreground shadow-sm md:flex'
								onClick={() => setCommandOpen(true)}
							>
								<span className='inline-flex items-center gap-2'>
									<Command size={16} className='text-primary' /> Search anything
								</span>
								<span className='rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-bold'>
									Ctrl K
								</span>
							</button>
							<NotificationCenter token={session.accessToken} />
							<button
								aria-label='Toggle theme'
								className='rounded-lg border border-border bg-background/70 p-2 shadow-sm hover:bg-[hsl(var(--surface-subtle))]'
								onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
							>
								{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
							</button>
							<button
								aria-label='Sign out'
								className='rounded-lg border border-border bg-background/70 p-2 shadow-sm hover:bg-[hsl(var(--surface-subtle))]'
								onClick={logout}
							>
								<LogOut size={18} />
							</button>
						</div>
					</header>
					<main className='mx-auto max-w-[1680px] p-4 lg:p-6'>
						<WorkflowRail
							view={currentView}
							availableViews={availableViews}
							onNavigate={navigate}
						/>
						{currentView === 'dashboard' && (
							<Dashboard token={session.accessToken} user={session.user} />
						)}
						{currentView === 'items' && (
							<Items token={session.accessToken} user={session.user} />
						)}
						{currentView === 'receipts' && (
							<Receiving
								token={session.accessToken}
								user={session.user}
								onOpenStorage={() => navigate('storage')}
							/>
						)}
						{currentView === 'storage' && (
							<Storage token={session.accessToken} />
						)}
						{currentView === 'ledger' && (
							<StockLedger token={session.accessToken} />
						)}
						{currentView === 'bin-card' && (
							<BinCardRoute token={session.accessToken} />
						)}
						{currentView === 'issues' && (
							<Issuance token={session.accessToken} user={session.user} />
						)}
						{currentView === 'returns' && (
							<ReturnsSection token={session.accessToken} user={session.user} />
						)}
						{currentView === 'approvals' && (
							<ApproverPortalSection token={session.accessToken} user={session.user} />
						)}
						{currentView === 'inspection' && (
							<InspectorPortalSection token={session.accessToken} user={session.user} />
						)}
						{currentView === 'counts' && (
							<PhysicalCounts token={session.accessToken} />
						)}
						{currentView === 'adjustments' && (
							<Adjustments token={session.accessToken} />
						)}
						{currentView === 'disposals' && (
							<DisposalManagement
								token={session.accessToken}
								user={session.user}
							/>
						)}
						{currentView === 'reports' && (
							<Reports token={session.accessToken} user={session.user} />
						)}
						{currentView === 'help' && <HelpCenter />}
						{currentView === 'settings' && <DesktopSettings />}
						{currentView === 'master' && (
							<MasterDataPage token={session.accessToken} />
						)}
						{currentView === 'audit' && (
							<AuditLogs token={session.accessToken} />
						)}
						{currentView === 'users' && (
							<UsersPage token={session.accessToken} />
						)}
					</main>
				</div>
			</div>
		</DesktopStartupGate>
	)
}

const rootElement = document.getElementById('root')!
const root = (rootElement as any).__fmohRoot ?? createRoot(rootElement)
;(rootElement as any).__fmohRoot = root
root.render(<App />)
