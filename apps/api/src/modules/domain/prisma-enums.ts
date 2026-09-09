export const RoleName = {
  SYSTEM_ADMINISTRATOR: "SYSTEM_ADMINISTRATOR",
  STOREKEEPER: "STOREKEEPER",
  DEPARTMENT_USER: "DEPARTMENT_USER",
  APPROVER: "APPROVER",
  INSPECTOR: "INSPECTOR",
  VIEWER_AUDITOR: "VIEWER_AUDITOR"
} as const;

export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const ItemKind = {
  CONSUMABLE: "CONSUMABLE",
  FIXED_ASSET: "FIXED_ASSET",
  DISPENSABLE_ASSET: "DISPENSABLE_ASSET",
  GENERAL_SUPPLY: "GENERAL_SUPPLY",
  MEDICINE: "MEDICINE",
  PERISHABLE: "PERISHABLE"
} as const;

export type ItemKind = (typeof ItemKind)[keyof typeof ItemKind];

export const StockSourceType = {
  PROCUREMENT: "PROCUREMENT",
  DONATION: "DONATION",
  GOVERNMENT_ALLOCATION: "GOVERNMENT_ALLOCATION",
  PROJECT_SUPPORT: "PROJECT_SUPPORT"
} as const;

export type StockSourceType = (typeof StockSourceType)[keyof typeof StockSourceType];

export const InspectionOutcome = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  PARTIALLY_ACCEPTED: "PARTIALLY_ACCEPTED",
  REJECTED: "REJECTED"
} as const;

export type InspectionOutcome = (typeof InspectionOutcome)[keyof typeof InspectionOutcome];

export const GoodsReceiptStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  PENDING_INSPECTION: "PENDING_INSPECTION",
  INSPECTED: "INSPECTED",
  ACCEPTED: "ACCEPTED",
  PARTIALLY_ACCEPTED: "PARTIALLY_ACCEPTED",
  REJECTED: "REJECTED",
  PENDING_STORAGE_ALLOCATION: "PENDING_STORAGE_ALLOCATION",
  COMPLETED: "COMPLETED"
} as const;

export type GoodsReceiptStatus = (typeof GoodsReceiptStatus)[keyof typeof GoodsReceiptStatus];

export const QualityStatus = {
  PASS: "PASS",
  FAIL: "FAIL",
  PARTIAL: "PARTIAL"
} as const;

export type QualityStatus = (typeof QualityStatus)[keyof typeof QualityStatus];

export const ApprovalType = {
  ISSUE_REQUEST: "ISSUE_REQUEST",
  STOCK_ADJUSTMENT: "STOCK_ADJUSTMENT",
  DISPOSAL: "DISPOSAL"
} as const;

export type ApprovalType = (typeof ApprovalType)[keyof typeof ApprovalType];

export const ApprovalStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED"
} as const;

export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const LedgerEntryType = {
  RECEIVE_PENDING_ALLOCATION: "RECEIVE_PENDING_ALLOCATION",
  RECEIPT: "RECEIPT",
  ISSUE: "ISSUE",
  ADJUSTMENT_IN: "ADJUSTMENT_IN",
  ADJUSTMENT_OUT: "ADJUSTMENT_OUT",
  DISPOSAL: "DISPOSAL",
  TRANSFER_IN: "TRANSFER_IN",
  TRANSFER_OUT: "TRANSFER_OUT"
} as const;

export type LedgerEntryType = (typeof LedgerEntryType)[keyof typeof LedgerEntryType];

export const IssueRequestStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PENDING_ISSUE: "PENDING_ISSUE",
  ISSUED: "ISSUED",
  PARTIALLY_ISSUED: "PARTIALLY_ISSUED",
  RECEIVED: "RECEIVED",
  CLOSED: "CLOSED"
} as const;

export type IssueRequestStatus = (typeof IssueRequestStatus)[keyof typeof IssueRequestStatus];

export const CountCycleType = {
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  ANNUAL: "ANNUAL"
} as const;

export type CountCycleType = (typeof CountCycleType)[keyof typeof CountCycleType];

export const CountStatus = {
  DRAFT: "DRAFT",
  COUNTING: "COUNTING",
  OPEN: "OPEN",
  SUBMITTED: "SUBMITTED",
  PENDING_RECONCILIATION: "PENDING_RECONCILIATION",
  RECONCILED: "RECONCILED",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED"
} as const;

export type CountStatus = (typeof CountStatus)[keyof typeof CountStatus];

export const DisposalStatus = {
  DRAFT: "DRAFT",
  IDENTIFIED: "IDENTIFIED",
  SUBMITTED: "SUBMITTED",
  COMMITTEE_REVIEW: "COMMITTEE_REVIEW",
  UNDER_REVIEW: "UNDER_REVIEW",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  DISPOSED: "DISPOSED",
  CLOSED: "CLOSED"
} as const;

export type DisposalStatus = (typeof DisposalStatus)[keyof typeof DisposalStatus];

export const ReportFormat = {
  PDF: "PDF",
  XLSX: "XLSX"
} as const;

export type ReportFormat = (typeof ReportFormat)[keyof typeof ReportFormat];

export const StockBatchStatus = {
  PENDING_STORAGE: "PENDING_STORAGE",
  AVAILABLE: "AVAILABLE",
  EXHAUSTED: "EXHAUSTED",
  QUARANTINED: "QUARANTINED"
} as const;

export type StockBatchStatus = (typeof StockBatchStatus)[keyof typeof StockBatchStatus];

export const BarcodeFormat = {
  BARCODE: "BARCODE",
  QR_CODE: "QR_CODE"
} as const;

export type BarcodeFormat = (typeof BarcodeFormat)[keyof typeof BarcodeFormat];

export const NotificationType = {
  LOW_STOCK: "LOW_STOCK",
  STOCK_OUT: "STOCK_OUT",
  NEAR_EXPIRY: "NEAR_EXPIRY",
  EXPIRED: "EXPIRED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  PENDING_INSPECTION: "PENDING_INSPECTION",
  PENDING_RECONCILIATION: "PENDING_RECONCILIATION",
  PENDING_DISPOSAL: "PENDING_DISPOSAL"
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const ReturnStatus = {
  PENDING_INSPECTION: "PENDING_INSPECTION",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PARTIALLY_APPROVED: "PARTIALLY_APPROVED"
} as const;

export type ReturnStatus = (typeof ReturnStatus)[keyof typeof ReturnStatus];

export const ReturnInspectionOutcome = {
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PARTIALLY_APPROVED: "PARTIALLY_APPROVED"
} as const;

export type ReturnInspectionOutcome = (typeof ReturnInspectionOutcome)[keyof typeof ReturnInspectionOutcome];

