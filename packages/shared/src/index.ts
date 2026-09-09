export const roles = [
  "SYSTEM_ADMINISTRATOR",
  "STOREKEEPER",
  "DEPARTMENT_USER",
  "APPROVER",
  "INSPECTOR",
  "VIEWER_AUDITOR"
] as const;

export type RoleName = (typeof roles)[number];

export const permissions = {
  USER_MANAGE: "user:manage",
  AUDIT_READ: "audit:read",
  ITEM_READ: "item:read",
  ITEM_WRITE: "item:write",
  ITEM_DEACTIVATE: "item:deactivate",
  RECEIPT_WRITE: "receipt:write",
  INSPECTION_WRITE: "inspection:write",
  STORAGE_WRITE: "storage:write",
  REQUEST_CREATE: "request:create",
  ISSUE_APPROVE: "issue:approve",
  ISSUE_EXECUTE: "issue:execute",
  RETURN_CREATE: "return:create",
  RETURN_READ: "return:read",
  RETURN_INSPECT: "return:inspect",
  LEDGER_READ: "ledger:read",
  DASHBOARD_READ: "dashboard:read",
  COUNT_WRITE: "count:write",
  ADJUSTMENT_APPROVE: "adjustment:approve",
  DISPOSAL_WRITE: "disposal:write",
  DISPOSAL_APPROVE: "disposal:approve",
  REPORT_READ: "report:read"
} as const;

export type Permission = (typeof permissions)[keyof typeof permissions];

export const rolePermissions: Record<RoleName, Permission[]> = {
  SYSTEM_ADMINISTRATOR: [
    permissions.USER_MANAGE,
    permissions.AUDIT_READ,
    permissions.ITEM_READ,
    permissions.ISSUE_APPROVE,
    permissions.INSPECTION_WRITE,
    permissions.RETURN_CREATE,
    permissions.RETURN_READ,
    permissions.RETURN_INSPECT,
    permissions.LEDGER_READ,
    permissions.DASHBOARD_READ,
    permissions.ADJUSTMENT_APPROVE,
    permissions.DISPOSAL_APPROVE,
    permissions.REPORT_READ
  ],
  STOREKEEPER: [
    permissions.ITEM_READ,
    permissions.ITEM_WRITE,
    permissions.RECEIPT_WRITE,
    permissions.STORAGE_WRITE,
    permissions.ISSUE_EXECUTE,
    permissions.RETURN_CREATE,
    permissions.RETURN_READ,
    permissions.LEDGER_READ,
    permissions.DASHBOARD_READ,
    permissions.COUNT_WRITE,
    permissions.DISPOSAL_WRITE,
    permissions.REPORT_READ
  ],
  DEPARTMENT_USER: [
    permissions.ITEM_READ,
    permissions.REQUEST_CREATE,
    permissions.RETURN_CREATE,
    permissions.RETURN_READ,
    permissions.DASHBOARD_READ
  ],
  APPROVER: [
    permissions.ITEM_READ,
    permissions.ISSUE_APPROVE,
    permissions.ADJUSTMENT_APPROVE,
    permissions.DISPOSAL_APPROVE,
    permissions.RETURN_READ,
    permissions.LEDGER_READ,
    permissions.DASHBOARD_READ,
    permissions.REPORT_READ
  ],
  INSPECTOR: [
    permissions.ITEM_READ,
    permissions.INSPECTION_WRITE,
    permissions.RETURN_INSPECT,
    permissions.RETURN_READ,
    permissions.LEDGER_READ,
    permissions.DASHBOARD_READ,
    permissions.REPORT_READ
  ],
  VIEWER_AUDITOR: [
    permissions.ITEM_READ,
    permissions.AUDIT_READ,
    permissions.RETURN_READ,
    permissions.LEDGER_READ,
    permissions.DASHBOARD_READ,
    permissions.REPORT_READ
  ]
};

export const reportTypes = [
  "stock-status",
  "receipt",
  "issue",
  "balance",
  "consumption",
  "disposal",
  "fast-moving",
  "slow-moving",
  "valuation",
  "stock-out",
  "reorder",
  "grn",
  "store-issue-voucher",
  "physical-count",
  "reconciliation-adjustment",
  "asset-custody",
  "audit-log"
] as const;

export type ReportType = (typeof reportTypes)[number];

export const roleReportTypes: Record<RoleName, ReportType[]> = {
  SYSTEM_ADMINISTRATOR: [
    "stock-status",
    "issue",
    "balance",
    "disposal",
    "physical-count",
    "reconciliation-adjustment",
    "asset-custody",
    "audit-log"
  ],
  STOREKEEPER: [
    "stock-status",
    "receipt",
    "issue",
    "balance",
    "consumption",
    "disposal",
    "fast-moving",
    "slow-moving",
    "valuation",
    "stock-out",
    "reorder",
    "grn",
    "store-issue-voucher",
    "physical-count",
    "asset-custody"
  ],
  DEPARTMENT_USER: [
    "issue",
    "store-issue-voucher"
  ],
  APPROVER: [
    "stock-status",
    "issue",
    "balance",
    "disposal",
    "physical-count",
    "reconciliation-adjustment",
    "store-issue-voucher"
  ],
  INSPECTOR: [
    "stock-status",
    "receipt",
    "issue",
    "balance",
    "grn",
    "store-issue-voucher"
  ],
  VIEWER_AUDITOR: [...reportTypes]
};

export type QrLabelPayload = {
  itemCode?: string;
  gtin?: string;
  itemName?: string;
  batchNumber?: string | null;
  lotNumber?: string | null;
  expiryDate?: string | Date | null;
  store?: string;
  gln?: string;
  locationCode?: string;
  shelfNumber?: string;
  binLocation?: string;
  quantity?: number | string;
  gs1?: {
    ai01Gtin?: string;
    ai10Lot?: string | null;
    ai17Expiry?: string;
    ai414Gln?: string;
    elementString?: string;
  };
};

function qrValue(value: unknown) {
  return value === undefined || value === null || value === "" ? "N/A" : String(value);
}

function escapeQrHtml(value: unknown) {
  const text = value === undefined || value === null || value === "" ? "N/A" : String(value);
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatQrDate(value: QrLabelPayload["expiryDate"]) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

export function buildQrLabelScanText(payload: QrLabelPayload) {
  const itemName = qrValue(payload.itemName);
  const store = qrValue(payload.store);
  const expiry = formatQrDate(payload.expiryDate);
  const elementString = qrValue(payload.gs1?.elementString);
  return [
    `This data represents an FMOH Inventory record for a ${itemName} stored in the ${store}.`,
    "",
    "ITEM DETAILS",
    `- Item Name: ${itemName}`,
    `- Item Code: ${qrValue(payload.itemCode)}`,
    `- GTIN: ${qrValue(payload.gtin)}`,
    `- Quantity: ${qrValue(payload.quantity)}`,
    "",
    "BATCH AND EXPIRY",
    `- Batch/Lot: ${qrValue(payload.lotNumber ?? payload.batchNumber)}`,
    `- Expiry Date: ${expiry}`,
    "",
    "STORAGE LOCATION",
    `- Store: ${store}`,
    `- Location ID: ${qrValue(payload.locationCode)}`,
    `- Shelf: ${qrValue(payload.shelfNumber)}`,
    `- Bin: ${qrValue(payload.binLocation)}`,
    "",
    "GS1 ELEMENT STRING",
    `- Full Code: ${elementString}`,
    `- (01) GTIN: ${qrValue(payload.gs1?.ai01Gtin)}`,
    `- (10) Batch/Lot: ${qrValue(payload.gs1?.ai10Lot ?? payload.lotNumber ?? payload.batchNumber)}`,
    `- (17) Expiry: ${qrValue(payload.gs1?.ai17Expiry)} (YYMMDD format)`
  ].join("\n");
}

export function buildOfflineQrLabelDataUrl(payload: QrLabelPayload) {
  return buildQrLabelScanText(payload);
}
