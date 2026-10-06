export const roles = [
  "SYSTEM_ADMINISTRATOR",
  "STOREKEEPER",
  "DEPARTMENT_USER",
  "APPROVER",
  "INSPECTOR",
  "VIEWER_AUDITOR",
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
  ISSUE_CREATE: "issue:create", // Alias for request:create
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
  REPORT_READ: "report:read",
} as const;

export type Permission = (typeof permissions)[keyof typeof permissions];

export const rolePermissions: Record<RoleName, Permission[]> = {
  SYSTEM_ADMINISTRATOR: Object.values(permissions),
  STOREKEEPER: [
    permissions.ITEM_READ,
    permissions.ITEM_WRITE,
    permissions.ITEM_DEACTIVATE,
    permissions.RECEIPT_WRITE,
    permissions.STORAGE_WRITE,
    permissions.ISSUE_EXECUTE,
    permissions.RETURN_CREATE,
    permissions.RETURN_READ,
    permissions.LEDGER_READ,
    permissions.DASHBOARD_READ,
    permissions.COUNT_WRITE,
    permissions.DISPOSAL_WRITE,
    permissions.REPORT_READ,
  ],
  DEPARTMENT_USER: [
    permissions.ITEM_READ,
    permissions.REQUEST_CREATE,
    permissions.ISSUE_CREATE,
    permissions.RETURN_CREATE,
    permissions.RETURN_READ,
    permissions.DASHBOARD_READ,
  ],
  APPROVER: [
    permissions.ITEM_READ,
    permissions.ISSUE_APPROVE,
    permissions.ADJUSTMENT_APPROVE,
    permissions.DISPOSAL_APPROVE,
    permissions.RETURN_READ,
    permissions.LEDGER_READ,
    permissions.DASHBOARD_READ,
    permissions.REPORT_READ,
  ],
  INSPECTOR: [
    permissions.ITEM_READ,
    permissions.INSPECTION_WRITE,
    permissions.RETURN_INSPECT,
    permissions.RETURN_READ,
    permissions.LEDGER_READ,
    permissions.DASHBOARD_READ,
    permissions.REPORT_READ,
  ],
  VIEWER_AUDITOR: [
    permissions.ITEM_READ,
    permissions.AUDIT_READ,
    permissions.RETURN_READ,
    permissions.LEDGER_READ,
    permissions.DASHBOARD_READ,
    permissions.REPORT_READ,
  ],
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
  "audit-log",
] as const;

export type ReportType = (typeof reportTypes)[number];

export const roleReportTypes: Record<RoleName, ReportType[]> = {
  SYSTEM_ADMINISTRATOR: [...reportTypes],
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
    "asset-custody",
  ],
  DEPARTMENT_USER: ["issue", "store-issue-voucher"],
  APPROVER: [
    "stock-status",
    "issue",
    "balance",
    "disposal",
    "physical-count",
    "reconciliation-adjustment",
    "store-issue-voucher",
  ],
  INSPECTOR: [
    "stock-status",
    "receipt",
    "issue",
    "balance",
    "grn",
    "store-issue-voucher",
  ],
  VIEWER_AUDITOR: [...reportTypes],
};

export type QrLabelPayload = {
  itemCode?: string;
  gtin?: string;
  itemName?: string;
  batchNumber?: string | null;
  lotNumber?: string | null;
  receivedDate?: string | Date | null;
  expiryDate?: string | Date | null;
  purpose?: string | null;
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
  return value === undefined || value === null || value === ""
    ? ""
    : String(value);
}

function displayValue(value: unknown) {
  return value === undefined || value === null || value === ""
    ? "—"
    : String(value);
}

function escapeQrHtml(value: unknown) {
  const text =
    value === undefined || value === null || value === "" ? "" : String(value);
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatQrDate(value: QrLabelPayload["expiryDate"], fallback = "") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function buildQrLabelScanText(payload: QrLabelPayload) {
  const itemName = displayValue(payload.itemName);
  const store = displayValue(payload.store);
  const received = formatQrDate(payload.receivedDate, "—");
  const expiry = formatQrDate(payload.expiryDate, "—");
  const purpose = displayValue(payload.purpose);
  const elementString = displayValue(payload.gs1?.elementString);
  return [
    `This data represents an FMOH Inventory record for a ${itemName} stored in the ${store}.`,
    "",
    "ITEM DETAILS",
    `- Item Name: ${itemName}`,
    `- Item Code: ${displayValue(payload.itemCode)}`,
    `- GTIN: ${displayValue(payload.gtin)}`,
    `- Purpose/Use: ${purpose}`,
    `- Quantity: ${displayValue(payload.quantity)}`,
    "",
    "BATCH AND EXPIRY",
    `- Batch/Lot: ${displayValue(payload.lotNumber ?? payload.batchNumber)}`,
    `- Received Date: ${received}`,
    `- Expiry Date: ${expiry}`,
    "",
    "STORAGE LOCATION",
    `- Store: ${store}`,
    `- Location ID: ${displayValue(payload.locationCode)}`,
    `- Shelf: ${displayValue(payload.shelfNumber)}`,
    `- Bin: ${displayValue(payload.binLocation)}`,
    "",
    "GS1 ELEMENT STRING",
    `- Full Code: ${elementString}`,
    `- (01) GTIN: ${displayValue(payload.gs1?.ai01Gtin)}`,
    `- (10) Batch/Lot: ${displayValue(payload.gs1?.ai10Lot ?? payload.lotNumber ?? payload.batchNumber)}`,
    `- (17) Expiry: ${displayValue(payload.gs1?.ai17Expiry)} (YYMMDD format)`,
  ].join("\n");
}

export function buildOfflineQrLabelDataUrl(
  payload: QrLabelPayload,
  origin = "",
) {
  const item = encodeURIComponent(payload.itemCode || "");
  const batch = encodeURIComponent(
    payload.batchNumber || payload.lotNumber || "",
  );
  const received = encodeURIComponent(
    payload.receivedDate ? String(payload.receivedDate).slice(0, 10) : "",
  );
  const expiry = encodeURIComponent(
    payload.expiryDate ? String(payload.expiryDate).slice(0, 10) : "",
  );
  const purpose = encodeURIComponent(payload.purpose || "");
  return `${origin}/scan?item=${item}&batch=${batch}&received=${received}&expiry=${expiry}&purpose=${purpose}`;
}
