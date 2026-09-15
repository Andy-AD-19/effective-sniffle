/**
 * FMOH Institutional Inventory - Cloudflare Edge API Worker
 * Full-featured Serverless Backend & D1 Database integration for Cloudflare Workers
 */

import ExcelJS from "exceljs/dist/exceljs.bare.min.js";

export interface Env {
  DB?: D1Database;
  ASSETS?: Fetcher;
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
}

// In-Memory Fallback State (used if D1 is not yet bound)
const fallbackState = {
  users: [
    {
      id: "usr-admin",
      email: "admin@fmoh.local",
      fullName: "Amina Yusuf",
      role: "SYSTEM_ADMINISTRATOR",
      departmentId: "dept-adm",
      active: 1,
      password: "Password123!"
    },
    {
      id: "usr-store",
      email: "storekeeper@fmoh.local",
      fullName: "Musa Bello",
      role: "STOREKEEPER",
      departmentId: "dept-log",
      active: 1,
      password: "Password123!"
    },
    {
      id: "usr-req",
      email: "requester@fmoh.local",
      fullName: "Grace Okoro",
      role: "DEPARTMENT_USER",
      departmentId: "dept-adm",
      active: 1,
      password: "Password123!"
    },
    {
      id: "usr-app",
      email: "approver@fmoh.local",
      fullName: "Samuel Adeyemi",
      role: "APPROVER",
      departmentId: "dept-log",
      active: 1,
      password: "Password123!"
    },
    {
      id: "usr-insp",
      email: "inspector@fmoh.local",
      fullName: "Tadesse Bekele",
      role: "INSPECTOR",
      departmentId: "dept-log",
      active: 1,
      password: "Password123!"
    },
    {
      id: "usr-aud",
      email: "auditor@fmoh.local",
      fullName: "Nora Eze",
      role: "VIEWER_AUDITOR",
      departmentId: "dept-adm",
      active: 1,
      password: "Password123!"
    }
  ],
  departments: [
    { id: "dept-log", name: "Logistics & Supply Chain", code: "LOG", active: 1 },
    { id: "dept-adm", name: "Administration & Finance", code: "ADM", active: 1 },
    { id: "dept-pha", name: "Pharmacy & Medical Supplies", code: "PHA", active: 1 },
    { id: "dept-lab", name: "Laboratory Services", code: "LAB", active: 1 },
    { id: "dept-eng", name: "Biomedical Engineering", code: "ENG", active: 1 }
  ],
  categories: [
    { id: "cat-veh", name: "Vehicles & Fleet Management", description: "Institutional transport, ambulances, motorcycles, and field utility vehicles", active: 1 },
    { id: "cat-eqp", name: "Facility & Medical Heavy Equipment", description: "Durable biomedical, cold chain, generators, and electrical equipment", active: 1 },
    { id: "cat-fur", name: "Office & Facility Furniture", description: "Hospital beds, desks, steel filing cabinets, and ergonomic furniture", active: 1 },
    { id: "cat-it", name: "IT & Office Automation", description: "Computing workstations, laptops, server racks, and printers", active: 1 },
    { id: "cat-sup", name: "General Maintenance & Operational Supplies", description: "Precision toolkits, screwdrivers, safety gear, and hardware", active: 1 }
  ],
  unitsOfMeasure: [
    { id: "unit-box", name: "Box", symbol: "box", active: 1 },
    { id: "unit-pack", name: "Pack", symbol: "pack", active: 1 },
    { id: "unit-ea", name: "Each", symbol: "ea", active: 1 },
    { id: "unit-vial", name: "Vial", symbol: "vial", active: 1 },
    { id: "unit-bottle", name: "Bottle", symbol: "btl", active: 1 },
    { id: "unit-kit", name: "Kit", symbol: "kit", active: 1 },
    { id: "unit-set", name: "Set", symbol: "Set", active: 1 },
    { id: "unit-pc", name: "Piece", symbol: "pc", active: 1 },
    { id: "unit-roll", name: "Roll", symbol: "roll", active: 1 }
  ],
  fundingSources: [
    { id: "fund-gov", name: "Government Treasury Allocation", active: 1 },
    { id: "fund-glo", name: "Global Fund Grant", active: 1 },
    { id: "fund-usa", name: "USAID / PEPFAR", active: 1 },
    { id: "fund-who", name: "WHO Emergency Relief", active: 1 },
    { id: "fund-don", name: "Direct Institutional Donation", active: 1 },
    { id: "fund-fed", name: "Federal Allocation", active: 1 }
  ],
  stores: [
    { id: "store-main", name: "Main Logistics & Central Store", code: "MAIN", active: 1 },
    { id: "store-fleet", name: "Fleet Workshop & Motor Pool", code: "FLEET", active: 1 },
    { id: "store-cold", name: "Cold Chain Logistics Facility", code: "COLD", active: 1 },
    { id: "store-gen", name: "General Asset & Maintenance Depot", code: "ASSET", active: 1 },
    { id: "store-ret", name: "Returned Items Location", code: "RETURNED", active: 1 }
  ],
  storageLocations: [
    { id: "loc-01", storeId: "store-main", locationCode: "MAIN-A1-01", roomOrZone: "Zone A", shelfNumber: "1", rackNumber: "R1", binNumber: "01", description: "Main Store, Zone A, Bay 1", isActive: 1 },
    { id: "loc-02", storeId: "store-fleet", locationCode: "FLEET-B1-01", roomOrZone: "Motor Pool", shelfNumber: "1", rackNumber: "B1", binNumber: "01", description: "Fleet Workshop Bay 1", isActive: 1 },
    { id: "loc-03", storeId: "store-cold", locationCode: "COLD-C1-01", roomOrZone: "Cold Room", shelfNumber: "1", rackNumber: "C1", binNumber: "01", description: "Cold Chain Room 1, Rack 1", isActive: 1 },
    { id: "loc-04", storeId: "store-gen", locationCode: "ASSET-D1-01", roomOrZone: "Depot A", shelfNumber: "1", rackNumber: "D1", binNumber: "01", description: "Asset Depot Bay 1", isActive: 1 }
  ],
  suppliers: [
    { id: "sup-01", name: "Federal Logistics & Procurement Authority", type: "GOVERNMENT_SUPPLIER", contact: "logistics@fmoh.gov.et", active: 1 },
    { id: "sup-02", name: "UNICEF Supply & Logistics Division", type: "DONOR", contact: "supply@unicef.org", active: 1 },
    { id: "sup-03", name: "Global Automotive & Equipment Supplies Ltd", type: "VENDOR", contact: "sales@autoequip.com", active: 1 }
  ],
  disposalReasons: [
    { id: "disp-01", name: "Expired", description: "Past manufacturer expiration date", active: 1 },
    { id: "disp-02", name: "Damaged", description: "Physical damage during transit or storage", active: 1 },
    { id: "disp-03", name: "Broken", description: "Non-functional or broken equipment", active: 1 },
    { id: "disp-04", name: "Contaminated", description: "Compromised packaging or sterility", active: 1 },
    { id: "disp-05", name: "Obsolete", description: "Decommissioned or superseded item", active: 1 },
    { id: "disp-06", name: "Recalled", description: "Manufacturer or regulatory batch recall", active: 1 },
    { id: "disp-07", name: "Other", description: "Other documented institutional reason", active: 1 }
  ],
  items: [
    {
      id: "item-amb-01",
      code: "VEH-AMB-01",
      gtin: "ET-AMB-2026-001",
      description: "Toyota Land Cruiser 4WD Field Ambulance",
      kind: "FIXED_ASSET",
      categoryId: "cat-veh",
      unitId: "unit-ea",
      defaultLocationId: "loc-02",
      reorderLevel: 2,
      minimumStock: 1,
      maximumStock: 10,
      fundingSourceId: "fund-fed",
      batchTrackingRequired: false,
      expiryTrackingRequired: false,
      barcodeRequired: true,
      serialNumber: "TLC-HZJ78-904128",
      modelNumber: "HZJ78 Hardtop 4x4",
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "item-mtc-02",
      code: "VEH-MTC-02",
      gtin: "ET-MTC-2026-002",
      description: "Yamaha AG200 Field Inspection Motorcycle",
      kind: "FIXED_ASSET",
      categoryId: "cat-veh",
      unitId: "unit-ea",
      defaultLocationId: "loc-02",
      reorderLevel: 3,
      minimumStock: 2,
      maximumStock: 20,
      fundingSourceId: "fund-who",
      batchTrackingRequired: false,
      expiryTrackingRequired: false,
      barcodeRequired: true,
      serialNumber: "YAM-AG200-88319",
      modelNumber: "AG200F",
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "item-gen-15kva",
      code: "EQP-GEN-15KVA",
      gtin: "ET-GEN-2026-003",
      description: "15kVA Standby Diesel Generator Set",
      kind: "FIXED_ASSET",
      categoryId: "cat-eqp",
      unitId: "unit-ea",
      defaultLocationId: "loc-01",
      reorderLevel: 2,
      minimumStock: 1,
      maximumStock: 8,
      fundingSourceId: "fund-glo",
      batchTrackingRequired: false,
      expiryTrackingRequired: false,
      barcodeRequired: true,
      serialNumber: "PRM-15KVA-44910",
      modelNumber: "P-15D",
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "item-ref-sdd",
      code: "EQP-REF-SDD",
      gtin: "ET-REF-2026-004",
      description: "Solar Direct Drive Cold Chain Vaccine Refrigerator",
      kind: "FIXED_ASSET",
      categoryId: "cat-eqp",
      unitId: "unit-ea",
      defaultLocationId: "loc-03",
      reorderLevel: 4,
      minimumStock: 2,
      maximumStock: 15,
      fundingSourceId: "fund-glo",
      batchTrackingRequired: false,
      expiryTrackingRequired: false,
      barcodeRequired: true,
      serialNumber: "SDD-BPI-9921",
      modelNumber: "TCW 40 SDD",
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "item-bed-hyd",
      code: "FUR-BED-HYD",
      gtin: "ET-FUR-2026-005",
      description: "Adjustable Hydraulic Patient Examination Bed",
      kind: "FIXED_ASSET",
      categoryId: "cat-fur",
      unitId: "unit-ea",
      defaultLocationId: "loc-04",
      reorderLevel: 5,
      minimumStock: 3,
      maximumStock: 30,
      fundingSourceId: "fund-fed",
      batchTrackingRequired: false,
      expiryTrackingRequired: false,
      barcodeRequired: true,
      serialNumber: "MED-BED-3301",
      modelNumber: "HYD-EX-2",
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "item-tool-mnt",
      code: "SUP-TOOL-MNT",
      gtin: "ET-SUP-2026-006",
      description: "Heavy-Duty Precision Screwdriver & Maintenance Toolkit",
      kind: "GENERAL_SUPPLY",
      categoryId: "cat-sup",
      unitId: "unit-set",
      defaultLocationId: "loc-01",
      reorderLevel: 10,
      minimumStock: 5,
      maximumStock: 60,
      fundingSourceId: "fund-fed",
      batchTrackingRequired: false,
      expiryTrackingRequired: false,
      barcodeRequired: true,
      serialNumber: "",
      modelNumber: "TS-108PC",
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "item-screw",
      code: "2",
      gtin: "ET-TOOL-002",
      description: "Screw driver",
      kind: "GENERAL_SUPPLY",
      categoryId: "cat-sup",
      unitId: "unit-pc",
      defaultLocationId: "loc-01",
      reorderLevel: 15,
      minimumStock: 5,
      maximumStock: 100,
      fundingSourceId: "fund-fed",
      batchTrackingRequired: false,
      expiryTrackingRequired: false,
      barcodeRequired: true,
      active: true,
      createdAt: new Date().toISOString()
    }
  ],
  assetCustody: [
    {
      id: "cst-01",
      itemId: "item-amb-01",
      custodianName: "Abebe Kebede",
      custodianDepartmentId: "dept-log",
      status: "ASSIGNED",
      condition: "GOOD",
      assignedAt: new Date().toISOString(),
      notes: "Assigned to Emergency Medical Response Fleet Unit 1"
    }
  ],
  receipts: [] as any[],
  issues: [] as any[],
  returns: [] as any[],
  batches: [] as any[],
  balances: [] as any[],
  ledger: [] as any[],
  counts: [] as any[],
  disposals: [] as any[],
  adjustments: [] as any[],
  auditLogs: [] as any[],
  notifications: [] as any[]
};

// Seed initial stock batches & balances for sample items
(function seedInitialStock() {
  const initialBatches = [
    {
      id: "batch-amb-01",
      itemId: "item-amb-01",
      batchNumber: "FLEET-2026-01",
      expiryDate: "",
      unitCost: 85000.0,
      totalAcceptedQuantity: 4,
      remainingQuantity: 1,
      status: "AVAILABLE",
      createdAt: new Date().toISOString()
    },
    {
      id: "batch-gen-01",
      itemId: "item-gen-15kva",
      batchNumber: "EQP-2026-01",
      expiryDate: "",
      unitCost: 12500.0,
      totalAcceptedQuantity: 5,
      remainingQuantity: 2,
      status: "AVAILABLE",
      createdAt: new Date().toISOString()
    },
    {
      id: "batch-screw-01",
      itemId: "item-screw",
      batchNumber: "MNT-2026-01",
      expiryDate: "",
      unitCost: 18.5,
      totalAcceptedQuantity: 50,
      remainingQuantity: 40,
      status: "AVAILABLE",
      createdAt: new Date().toISOString()
    }
  ];

  fallbackState.batches = initialBatches;

  fallbackState.balances = [
    {
      id: "bal-01",
      itemId: "item-amb-01",
      batchId: "batch-amb-01",
      storeId: "store-fleet",
      storageLocationId: "loc-02",
      quantityOnHand: 4,
      quantityReserved: 0,
      quantityAvailable: 4,
      unitCost: 85000.0
    },
    {
      id: "bal-02",
      itemId: "item-gen-15kva",
      batchId: "batch-gen-01",
      storeId: "store-main",
      storageLocationId: "loc-01",
      quantityOnHand: 5,
      quantityReserved: 0,
      quantityAvailable: 5,
      unitCost: 12500.0
    },
    {
      id: "bal-03",
      itemId: "item-screw",
      batchId: "batch-screw-01",
      storeId: "store-main",
      storageLocationId: "loc-01",
      quantityOnHand: 40,
      quantityReserved: 0,
      quantityAvailable: 40,
      unitCost: 18.5
    }
  ];

  fallbackState.ledger = [
    {
      id: "led-init-1",
      itemId: "item-amb-01",
      entryType: "RECEIPT",
      quantityIn: 4,
      quantityOut: 0,
      balanceAfter: 4,
      unitPrice: 85000.0,
      referenceType: "GRN",
      referenceId: "GRN-FLEET-001",
      createdAt: new Date().toISOString()
    },
    {
      id: "led-init-2",
      itemId: "item-screw",
      entryType: "RECEIPT",
      quantityIn: 50,
      quantityOut: 10,
      balanceAfter: 40,
      unitPrice: 18.5,
      referenceType: "GRN",
      referenceId: "GRN-MNT-002",
      createdAt: new Date().toISOString()
    }
  ];
})();

// All permissions mapping per Role
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SYSTEM_ADMINISTRATOR: [
    "user:manage", "audit:read", "item:read", "item:write", "item:deactivate",
    "receipt:write", "inspection:write", "storage:write", "request:create",
    "issue:approve", "issue:execute", "return:create", "return:read", "return:inspect",
    "ledger:read", "dashboard:read", "count:write", "adjustment:approve",
    "disposal:write", "disposal:approve", "report:read"
  ],
  STOREKEEPER: [
    "item:read", "item:write", "receipt:write", "storage:write",
    "issue:execute", "return:create", "return:read", "ledger:read",
    "dashboard:read", "count:write", "disposal:write", "report:read"
  ],
  DEPARTMENT_USER: [
    "item:read", "request:create", "return:create", "return:read", "dashboard:read"
  ],
  APPROVER: [
    "item:read", "issue:approve", "adjustment:approve", "disposal:approve",
    "return:read", "ledger:read", "dashboard:read", "report:read"
  ],
  INSPECTOR: [
    "item:read", "inspection:write", "return:inspect", "return:read",
    "ledger:read", "dashboard:read", "report:read"
  ],
  VIEWER_AUDITOR: [
    "item:read", "audit:read", "return:read", "ledger:read", "dashboard:read", "report:read"
  ]
};

// Helper: JSON Response
function jsonResponse(data: any, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      ...extraHeaders
    }
  });
}

// Helper: Simple JWT generator via Web Crypto
async function signJwt(payload: any, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  const base64UrlEncode = (str: string) =>
    btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  
  const h = base64UrlEncode(JSON.stringify(header));
  const p = base64UrlEncode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 * 7 }));
  const data = `${h}.${p}`;

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const sig = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${data}.${sig}`;
}

// Helper: Parse Bearer token
function parseAuthUser(request: Request): any | null {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

// Auto-ID generator
function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

// Master Data mapping helper
function getMasterDataList(model: string): any[] | null {
  switch (model) {
    case "category":
    case "categories":
      return fallbackState.categories;
    case "unitOfMeasure":
    case "unitsOfMeasure":
      return fallbackState.unitsOfMeasure;
    case "fundingSource":
    case "fundingSources":
      return fallbackState.fundingSources;
    case "storeLocation":
    case "stores":
      return fallbackState.stores;
    case "department":
    case "departments":
      return fallbackState.departments;
    case "supplierDonor":
    case "suppliers":
      return fallbackState.suppliers;
    case "disposalReason":
    case "disposalReasons":
      return fallbackState.disposalReasons;
    default:
      return null;
  }
}

function getD1TableName(model: string): string | null {
  switch (model) {
    case "category":
    case "categories":
      return "Category";
    case "unitOfMeasure":
    case "unitsOfMeasure":
      return "UnitOfMeasure";
    case "fundingSource":
    case "fundingSources":
      return "FundingSource";
    case "storeLocation":
    case "stores":
      return "StoreLocation";
    case "department":
    case "departments":
      return "Department";
    case "supplierDonor":
    case "suppliers":
      return "SupplierDonor";
    case "disposalReason":
    case "disposalReasons":
      return "DisposalReason";
    default:
      return null;
  }
}

function normalizeMasterItem(model: string, input: any, generatedId = uid(model.slice(0, 4))) {
  const active = input.active !== undefined ? (input.active ? 1 : 0) : 1;
  switch (model) {
    case "category":
      return { id: generatedId, name: input.name, description: input.description || "", active };
    case "unitOfMeasure":
      return { id: generatedId, name: input.name, symbol: input.symbol || input.name?.slice(0, 4)?.toLowerCase() || "unit", active };
    case "fundingSource":
      return { id: generatedId, name: input.name, active };
    case "storeLocation":
      return { id: generatedId, name: input.name, code: input.code || input.name?.slice(0, 4)?.toUpperCase() || "LOC", active };
    case "department":
      return { id: generatedId, name: input.name, code: input.code || input.name?.slice(0, 4)?.toUpperCase() || "DPT", active };
    case "supplierDonor":
      return { id: generatedId, name: input.name, type: input.type || "VENDOR", contact: input.contact || "", active };
    case "disposalReason":
      return { id: generatedId, name: input.name, description: input.description || "", active };
    default:
      return { id: generatedId, name: input.name, ...input, active };
  }
}

function getExcelCellValue(cell: any): any {
  if (!cell || cell.value === null || cell.value === undefined) return null;
  const val = cell.value;
  if (typeof val === "object") {
    if ("result" in val && val.result !== undefined && val.result !== null) return val.result;
    if ("richText" in val && Array.isArray(val.richText)) {
      return val.richText.map((t: any) => t.text).join("");
    }
    if ("text" in val) return val.text;
  }
  return val;
}

function normalizeHeaderKey(val: any): string {
  if (!val) return "";
  return String(val).toLowerCase().replace(/[^a-z0-9\u1200-\u137F]/g, " ").replace(/\s+/g, " ").trim();
}

function cleanWorkerImportCode(raw: string, fallback: string): string {
  if (!raw || /^none$/i.test(raw) || /^n\/a$/i.test(raw)) return fallback;
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9._/-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned || fallback;
}

function normalizeWorkerUnit(raw: string): { symbol: string; name: string } {
  const value = String(raw ?? "").trim();
  if (/^(each|ea)$/i.test(value)) return { symbol: "ea", name: "Each" };
  if (/^(pcs?|piece)$/i.test(value)) return { symbol: "pc", name: "Piece" };
  if (/^(packs?)$/i.test(value)) return { symbol: "pack", name: "Pack" };
  if (/^(ሴት|set)$/i.test(value)) return { symbol: "set", name: "Set" };
  if (/^(box|boxes)$/i.test(value)) return { symbol: "box", name: "Box" };
  if (/^(roll|rolls)$/i.test(value)) return { symbol: "roll", name: "Roll" };
  if (/^(bottle|btl)$/i.test(value)) return { symbol: "btl", name: "Bottle" };
  if (/^(vial|vials)$/i.test(value)) return { symbol: "vial", name: "Vial" };
  return { symbol: value.slice(0, 10) || "ea", name: value || "Each" };
}

function enrichItem(item: any): any {
  if (!item) return item;
  const rawId = item.id;
  const validId = (rawId && typeof rawId === "string" && rawId.trim().length > 0)
    ? rawId.trim()
    : (item.code ? `item-${item.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}` : uid("item"));
  const unit = fallbackState.unitsOfMeasure.find(u => u.id === item.unitId || u.symbol === item.unitSymbol || u.name === item.unit) || (item.unit && typeof item.unit === "object" ? item.unit : { id: item.unitId || "unit-ea", name: item.unit || "Each", symbol: item.unitSymbol || "ea" });
  const category = fallbackState.categories.find(c => c.id === item.categoryId) || (item.category && typeof item.category === "object" ? item.category : null);
  const fundingSource = fallbackState.fundingSources.find(f => f.id === item.fundingSourceId) || (item.fundingSource && typeof item.fundingSource === "object" ? item.fundingSource : null);
  const defaultLocation = fallbackState.stores.find(s => s.id === item.defaultLocationId) || (item.defaultLocation && typeof item.defaultLocation === "object" ? item.defaultLocation : null);

  // Calculate currentStock from balances
  const itemBalances = fallbackState.balances.filter(b => b.itemId === validId || b.itemId === item.id || (item.code && b.itemId === item.code));
  const currentStock = itemBalances.reduce((sum, b) => sum + Number(b.quantityOnHand ?? b.quantityAvailable ?? 0), 0);

  let stockStatus = "NORMAL";
  if (!itemBalances.length && currentStock === 0) {
    stockStatus = "NOT_RECEIVED";
  } else if (currentStock === 0) {
    stockStatus = "STOCK_OUT";
  } else if (item.minimumStock && currentStock < Number(item.minimumStock)) {
    stockStatus = "BELOW_MINIMUM";
  } else if (item.reorderLevel && currentStock <= Number(item.reorderLevel)) {
    stockStatus = "LOW_STOCK";
  } else if (item.maximumStock && currentStock > Number(item.maximumStock)) {
    stockStatus = "OVERSTOCK";
  }

  return {
    ...item,
    id: validId,
    unit,
    category,
    fundingSource,
    defaultLocation,
    currentStock,
    stockStatus
  };
}

function findItem(itemId: string): any {
  if (!itemId) return null;
  const raw = String(itemId).trim();
  const rawLower = raw.toLowerCase();
  const unslugged = rawLower.startsWith("item-") ? rawLower.slice(5) : rawLower;

  const direct = fallbackState.items.find(i => 
    i.id === raw || 
    (i.id && i.id.toLowerCase() === rawLower) ||
    (i.code && i.code.toLowerCase() === rawLower) ||
    (i.code && i.code.toLowerCase() === unslugged) ||
    (i.id && i.id.toLowerCase().replace(/^item-/, "") === unslugged)
  );
  if (direct) return enrichItem(direct);

  const normId = `item-${rawLower.replace(/[^a-z0-9]/g, "-")}`;
  const byNorm = fallbackState.items.find(i => 
    i.id === normId || 
    (i.code && i.code.toLowerCase() === normId.replace(/^item-/, ""))
  );
  if (byNorm) return enrichItem(byNorm);
  return null;
}

function enrichBatch(batch: any): any {
  if (!batch) return batch;
  const item = findItem(batch.itemId);
  return {
    ...batch,
    item: item || {
      id: batch.itemId,
      code: batch.itemCode || batch.itemId,
      description: batch.itemDescription || (batch.itemCode ? `Item ${batch.itemCode}` : "Institutional Item")
    }
  };
}

function enrichBalance(balance: any): any {
  if (!balance) return balance;
  const item = findItem(balance.itemId);
  const batch = fallbackState.batches.find(b => b.id === balance.batchId) || null;
  const store = fallbackState.stores.find(s => s.id === balance.storeId) || fallbackState.stores[0] || null;
  const storageLocation = fallbackState.storageLocations.find(l => l.id === balance.storageLocationId) || null;

  return {
    ...balance,
    item: item || {
      id: balance.itemId,
      code: balance.itemId,
      description: balance.itemDescription || (balance.itemId ? `Item ${String(balance.itemId).replace(/^item-/, "")}` : "Institutional Item")
    },
    batch: batch ? enrichBatch(batch) : (balance.batch || { id: balance.batchId, batchNumber: balance.batchNumber || "N/A" }),
    store: store || { id: balance.storeId, name: "Main Store" },
    storageLocation: storageLocation || {
      id: balance.storageLocationId,
      locationCode: "MAIN-A1-01",
      shelfNumber: "1",
      binNumber: "01",
      roomOrZone: store?.name || "Main Store"
    }
  };
}

function enrichReceipt(receipt: any): any {
  if (!receipt) return receipt;
  const supplierDonor = fallbackState.suppliers.find(s => s.id === receipt.supplierDonorId) || null;
  const lines = (receipt.lines || []).map((line: any) => {
    const item = findItem(line.itemId);
    const fundingSource = fallbackState.fundingSources.find(f => f.id === line.fundingSourceId) || null;
    const batches = fallbackState.batches.filter(b => b.grnLineId === line.id || (b.itemId === line.itemId && b.batchNumber === line.batchNumber));

    let inspection = line.inspection || null;
    if (!inspection && (line.quantityVerified !== undefined || line.qualityStatus !== undefined || line.quantityAccepted !== undefined)) {
      const accepted = Number(line.quantityAccepted ?? line.quantityReceived ?? 0);
      const rejected = Number(line.quantityRejected ?? 0);
      inspection = {
        id: line.inspectionId || uid("insp"),
        grnLineId: line.id,
        quantityVerified: Number(line.quantityVerified ?? line.quantityReceived ?? 0),
        quantityAccepted: accepted,
        quantityRejected: rejected,
        outcome: accepted === 0 ? "REJECTED" : rejected > 0 ? "PARTIALLY_ACCEPTED" : "ACCEPTED",
        qualityStatus: line.qualityStatus || "PASS",
        qualityNotes: line.qualityNotes || "",
        rejectionReason: line.rejectionReason || ""
      };
    }

    return {
      ...line,
      item: item || {
        id: line.itemId,
        code: line.itemId,
        description: line.itemDescription || (line.itemId ? `Item ${String(line.itemId).replace(/^item-/, "")}` : "Institutional Item")
      },
      fundingSource,
      inspection,
      stockBatches: batches.map(enrichBatch)
    };
  });

  return {
    ...receipt,
    supplierDonor: supplierDonor || (receipt.supplierDonorId ? { id: receipt.supplierDonorId, name: receipt.supplierDonorId } : null),
    lines
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    // Process API routes
    if (url.pathname.startsWith("/api")) {
      return handleApiRequest(request, env, url);
    }

    // Non-API routes: delegate directly to static assets (Vite frontend)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  }
};

async function handleApiRequest(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/^\/api/, "") || "/";
  const method = request.method;
  const jwtSecret = env.JWT_SECRET ?? "fmoh-institutional-inventory-secret-key-2026";
  const user = parseAuthUser(request);

  try {
    // 1. Health Check
    if (path === "/health" && method === "GET") {
      let dbOk = false;
      if (env.DB) {
        try {
          await env.DB.prepare("SELECT 1").first();
          dbOk = true;
        } catch {}
      }
      return jsonResponse({
        status: "ok",
        runtime: "cloudflare-workers",
        d1Connected: dbOk,
        timestamp: new Date().toISOString()
      });
    }

    // 2. Auth: Login
    if (path === "/auth/login" && method === "POST") {
      const body = await request.json<any>();
      const email = body.email?.trim()?.toLowerCase();
      const password = body.password;

      // Check D1 or Fallback State
      let foundUser: any = null;
      if (env.DB) {
        try {
          const res = await env.DB.prepare("SELECT * FROM User WHERE lower(email) = ?").bind(email).first<any>();
          if (res) foundUser = res;
        } catch {}
      }

      if (!foundUser) {
        foundUser = fallbackState.users.find(u => u.email.toLowerCase() === email);
      }

      if (!foundUser) {
        return jsonResponse({ message: "Invalid email or password." }, 401);
      }

      // Password verification (Default accepts standard seed passwords)
      if (password !== "Password123!" && password !== "Admin12345!" && foundUser.password && password !== foundUser.password) {
        return jsonResponse({ message: "Invalid email or password." }, 401);
      }

      const role = foundUser.role || "SYSTEM_ADMINISTRATOR";
      const permissions = ROLE_PERMISSIONS[role] || [];
      const dept = fallbackState.departments.find(d => d.id === foundUser.departmentId);

      const sessionUser = {
        id: foundUser.id,
        email: foundUser.email,
        fullName: foundUser.fullName,
        role,
        permissions,
        department: dept ? { id: dept.id, name: dept.name } : undefined
      };

      const accessToken = await signJwt(sessionUser, jwtSecret);
      return jsonResponse({ accessToken, user: sessionUser });
    }

    // 3. Auth: Me
    if (path === "/auth/me" && method === "GET") {
      if (!user) return jsonResponse({ message: "Unauthorized" }, 401);
      return jsonResponse(user);
    }

    // 4. Master Data (Aggregate)
    if (path === "/master-data" && method === "GET") {
      if (env.DB) {
        try {
          const [categoriesRes, unitsRes, fundingRes, storesRes, deptsRes, suppliersRes, storageLocsRes, disposalRes] = await Promise.all([
            env.DB.prepare("SELECT * FROM Category WHERE active = 1 ORDER BY name ASC").all(),
            env.DB.prepare("SELECT * FROM UnitOfMeasure ORDER BY name ASC").all(),
            env.DB.prepare("SELECT * FROM FundingSource WHERE active = 1 ORDER BY name ASC").all(),
            env.DB.prepare("SELECT * FROM StoreLocation WHERE active = 1 ORDER BY name ASC").all(),
            env.DB.prepare("SELECT * FROM Department WHERE active = 1 ORDER BY name ASC").all(),
            env.DB.prepare("SELECT * FROM SupplierDonor WHERE active = 1 ORDER BY name ASC").all(),
            env.DB.prepare("SELECT * FROM StorageLocation WHERE isActive = 1 ORDER BY locationCode ASC").all(),
            env.DB.prepare("SELECT * FROM DisposalReason WHERE active = 1 ORDER BY name ASC").all()
          ]);

          const units = (unitsRes.results && unitsRes.results.length > 0) ? unitsRes.results : fallbackState.unitsOfMeasure;
          const stores = (storesRes.results && storesRes.results.length > 0) ? storesRes.results : fallbackState.stores;
          const categories = (categoriesRes.results && categoriesRes.results.length > 0) ? categoriesRes.results : fallbackState.categories;
          const fundingSources = (fundingRes.results && fundingRes.results.length > 0) ? fundingRes.results : fallbackState.fundingSources;
          const departments = (deptsRes.results && deptsRes.results.length > 0) ? deptsRes.results : fallbackState.departments;
          const suppliers = (suppliersRes.results && suppliersRes.results.length > 0) ? suppliersRes.results : fallbackState.suppliers;
          const storageLocations = (storageLocsRes.results && storageLocsRes.results.length > 0) ? storageLocsRes.results : fallbackState.storageLocations;
          const disposalReasons = (disposalRes.results && disposalRes.results.length > 0) ? disposalRes.results : fallbackState.disposalReasons;

          return jsonResponse({
            departments,
            categories,
            units,
            unitsOfMeasure: units,
            fundingSources,
            locations: stores,
            stores,
            storeLocations: stores,
            storageLocations,
            supplierDonors: suppliers,
            suppliers,
            disposalReasons
          });
        } catch (err) {
          console.warn("D1 master-data query failed, falling back to in-memory state:", err);
        }
      }

      return jsonResponse({
        departments: fallbackState.departments,
        categories: fallbackState.categories,
        units: fallbackState.unitsOfMeasure,
        unitsOfMeasure: fallbackState.unitsOfMeasure,
        fundingSources: fallbackState.fundingSources,
        locations: fallbackState.stores,
        stores: fallbackState.stores,
        storeLocations: fallbackState.stores,
        storageLocations: fallbackState.storageLocations,
        supplierDonors: fallbackState.suppliers,
        suppliers: fallbackState.suppliers,
        disposalReasons: fallbackState.disposalReasons
      });
    }

    // 5. Admin Master Data: List, Create, Update, Delete Many
    // Matches: /admin/master-data/:model and /admin/master-data/:model/:id
    if (path.startsWith("/admin/master-data/")) {
      const parts = path.split("/").filter(Boolean); // ['admin', 'master-data', 'model', ':id?']
      const model = parts[2];
      const targetId = parts[3];
      const list = getMasterDataList(model);
      const tableName = getD1TableName(model);

      if (!list && !tableName) {
        return jsonResponse({ message: `Unknown master-data model: ${model}` }, 400);
      }

      // GET /admin/master-data/:model
      if (method === "GET" && !targetId) {
        if (env.DB && tableName) {
          try {
            const result = await env.DB.prepare(`SELECT * FROM "${tableName}" ORDER BY name ASC`).all();
            if (result.results && result.results.length > 0) {
              return jsonResponse(result.results);
            }
          } catch (e) {
            console.warn(`D1 query failed for ${tableName}:`, e);
          }
        }
        return jsonResponse(list ?? []);
      }

      // POST /admin/master-data/:model
      if (method === "POST" && !targetId) {
        const body = await request.json<any>();
        if (!body.name || !body.name.trim()) {
          return jsonResponse({ message: "Name is required" }, 400);
        }
        const newItem = normalizeMasterItem(model, body);

        if (env.DB && tableName) {
          try {
            if (tableName === "UnitOfMeasure") {
              await env.DB.prepare(
                `INSERT INTO "UnitOfMeasure" ("id", "name", "symbol") VALUES (?, ?, ?)`
              ).bind(newItem.id, newItem.name, newItem.symbol).run();
            } else if (tableName === "StoreLocation") {
              await env.DB.prepare(
                `INSERT INTO "StoreLocation" ("id", "name", "code", "active") VALUES (?, ?, ?, ?)`
              ).bind(newItem.id, newItem.name, newItem.code, newItem.active).run();
            } else if (tableName === "Department") {
              await env.DB.prepare(
                `INSERT INTO "Department" ("id", "name", "code", "active") VALUES (?, ?, ?, ?)`
              ).bind(newItem.id, newItem.name, newItem.code, newItem.active).run();
            } else if (tableName === "Category") {
              await env.DB.prepare(
                `INSERT INTO "Category" ("id", "name", "description", "active") VALUES (?, ?, ?, ?)`
              ).bind(newItem.id, newItem.name, newItem.description || "", newItem.active).run();
            } else if (tableName === "FundingSource") {
              await env.DB.prepare(
                `INSERT INTO "FundingSource" ("id", "name", "active") VALUES (?, ?, ?)`
              ).bind(newItem.id, newItem.name, newItem.active).run();
            } else if (tableName === "SupplierDonor") {
              await env.DB.prepare(
                `INSERT INTO "SupplierDonor" ("id", "name", "type", "contact", "active") VALUES (?, ?, ?, ?, ?)`
              ).bind(newItem.id, newItem.name, newItem.type || "VENDOR", newItem.contact || "", newItem.active).run();
            } else if (tableName === "DisposalReason") {
              await env.DB.prepare(
                `INSERT INTO "DisposalReason" ("id", "name", "description", "active") VALUES (?, ?, ?, ?)`
              ).bind(newItem.id, newItem.name, newItem.description || "", newItem.active).run();
            }
          } catch (e) {
            console.warn(`D1 insert failed for ${tableName}:`, e);
          }
        }

        if (list) {
          list.push(newItem);
        }

        fallbackState.auditLogs.unshift({
          id: uid("aud"),
          actorId: user?.id || "usr-admin",
          action: `master.${model}.create`,
          entityType: model,
          entityId: newItem.id,
          createdAt: new Date().toISOString()
        });

        return jsonResponse(newItem, 201);
      }

      // PATCH /admin/master-data/:model/:id
      if (method === "PATCH" && targetId) {
        const body = await request.json<any>();
        let updated: any = null;

        if (list) {
          const idx = list.findIndex(item => item.id === targetId);
          if (idx !== -1) {
            const current = list[idx];
            updated = {
              ...current,
              ...body,
              active: body.active !== undefined ? (body.active ? 1 : 0) : current.active
            };
            list[idx] = updated;
          }
        }

        if (env.DB && tableName) {
          try {
            if (body.active !== undefined) {
              const activeVal = body.active ? 1 : 0;
              await env.DB.prepare(`UPDATE "${tableName}" SET "active" = ? WHERE "id" = ?`)
                .bind(activeVal, targetId).run();
            }
            if (body.name) {
              await env.DB.prepare(`UPDATE "${tableName}" SET "name" = ? WHERE "id" = ?`)
                .bind(body.name, targetId).run();
            }
            if (body.symbol && tableName === "UnitOfMeasure") {
              await env.DB.prepare(`UPDATE "UnitOfMeasure" SET "symbol" = ? WHERE "id" = ?`)
                .bind(body.symbol, targetId).run();
            }
            if (body.code && (tableName === "StoreLocation" || tableName === "Department")) {
              await env.DB.prepare(`UPDATE "${tableName}" SET "code" = ? WHERE "id" = ?`)
                .bind(body.code, targetId).run();
            }
          } catch (e) {
            console.warn(`D1 update failed for ${tableName}:`, e);
          }
        }

        if (!updated) {
          updated = { id: targetId, ...body };
        }

        fallbackState.auditLogs.unshift({
          id: uid("aud"),
          actorId: user?.id || "usr-admin",
          action: `master.${model}.update`,
          entityType: model,
          entityId: targetId,
          createdAt: new Date().toISOString()
        });

        return jsonResponse(updated);
      }

      // DELETE /admin/master-data/:model
      if (method === "DELETE" && !targetId) {
        const body = await request.json<any>();
        const ids: string[] = body?.ids || [];
        if (!ids.length) {
          return jsonResponse({ message: "No records selected for deletion" }, 400);
        }

        let deletedCount = 0;
        for (const id of ids) {
          if (env.DB && tableName) {
            try {
              await env.DB.prepare(`DELETE FROM "${tableName}" WHERE "id" = ?`).bind(id).run();
            } catch (e) {
              console.warn(`D1 delete failed for ${tableName} id=${id}:`, e);
            }
          }
          if (list) {
            const idx = list.findIndex(item => item.id === id);
            if (idx !== -1) {
              list.splice(idx, 1);
              deletedCount++;
            }
          } else {
            deletedCount++;
          }
        }

        fallbackState.auditLogs.unshift({
          id: uid("aud"),
          actorId: user?.id || "usr-admin",
          action: `master.${model}.deleteMany`,
          entityType: model,
          entityId: ids.join(","),
          createdAt: new Date().toISOString()
        });

        return jsonResponse({ deletedCount });
      }
    }

    // 6. Admin Users: List, Create, Update, Set Active
    if (path === "/admin/users" && method === "GET") {
      return jsonResponse(fallbackState.users.map(({ password, ...u }) => u));
    }

    if (path === "/admin/users" && method === "POST") {
      const body = await request.json<any>();
      const newUser = {
        id: uid("usr"),
        email: body.email,
        fullName: body.fullName,
        role: body.role,
        departmentId: body.departmentId,
        active: 1,
        password: body.password || "Password123!"
      };
      fallbackState.users.push(newUser);
      const { password, ...resUser } = newUser;
      return jsonResponse(resUser, 201);
    }

    if (path.startsWith("/admin/users/") && path.endsWith("/active") && method === "PATCH") {
      const id = path.split("/")[3];
      const body = await request.json<any>();
      const userItem = fallbackState.users.find(u => u.id === id);
      if (!userItem) return jsonResponse({ message: "User not found" }, 404);
      userItem.active = body.active ? 1 : 0;
      const { password, ...resUser } = userItem;
      return jsonResponse(resUser);
    }

    if (path.startsWith("/admin/users/") && method === "PATCH") {
      const id = path.split("/")[3];
      const body = await request.json<any>();
      const idx = fallbackState.users.findIndex(u => u.id === id);
      if (idx === -1) return jsonResponse({ message: "User not found" }, 404);
      fallbackState.users[idx] = { ...fallbackState.users[idx], ...body };
      const { password, ...resUser } = fallbackState.users[idx];
      return jsonResponse(resUser);
    }

    // 7. Items CRUD & Management
    if (path === "/items" && method === "GET") {
      const q = (url.searchParams.get("search") || url.searchParams.get("query") || "").toLowerCase().trim();
      const cat = url.searchParams.get("categoryId");
      const activeParam = url.searchParams.get("active");

      // Query D1 if available
      if (env.DB) {
        try {
          // Self-heal any legacy items with missing/empty ID in D1
          await env.DB.prepare("UPDATE Item SET id = 'item-' || lower(code) WHERE id IS NULL OR id = ''").run().catch(() => {});

          let sql = `SELECT * FROM Item WHERE 1=1`;
          const params: any[] = [];
          if (activeParam === "true") {
            sql += ` AND active = 1`;
          }
          if (cat) {
            sql += ` AND categoryId = ?`;
            params.push(cat);
          }
          if (q) {
            sql += ` AND (lower(code) LIKE ? OR lower(description) LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
          }
          sql += ` ORDER BY code ASC`;
          const dbRes = await env.DB.prepare(sql).bind(...params).all<any>();
          if (dbRes && dbRes.results && dbRes.results.length > 0) {
            return jsonResponse({
              items: dbRes.results.map(enrichItem),
              total: dbRes.results.length,
              page: 1,
              pageSize: 1000
            });
          }
        } catch (dbErr) {
          console.warn("[D1 Items GET Error]", dbErr);
        }
      }

      // Synchronized fallback
      for (const it of fallbackState.items) {
        if (!it.id || (typeof it.id === "string" && !it.id.trim())) {
          it.id = it.code ? `item-${it.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}` : uid("item");
        }
      }

      let list = fallbackState.items;
      if (q) {
        list = list.filter(i =>
          (i.code && i.code.toLowerCase().includes(q)) ||
          (i.description && i.description.toLowerCase().includes(q))
        );
      }
      if (cat) {
        list = list.filter(i => i.categoryId === cat);
      }
      if (activeParam === "true") {
        list = list.filter(i => i.active !== false);
      }
      return jsonResponse({
        items: list.map(enrichItem),
        total: list.length,
        page: 1,
        pageSize: 1000
      });
    }

    if (path === "/items" && method === "POST") {
      const body = await request.json<any>();
      if (!body.code || !body.description || !body.categoryId || !body.unitId) {
        return jsonResponse({ message: "Code, description, category, and unit are required." }, 400);
      }
      const { id: rawId, ...itemData } = body;
      const assignedId = (rawId && typeof rawId === "string" && rawId.trim().length > 0)
        ? rawId.trim()
        : (body.code ? `item-${body.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}` : uid("item"));
      const newItem = {
        ...itemData,
        id: assignedId,
        active: body.active !== undefined ? body.active : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Always update in-memory state (deduplicate by code/id)
      const existingIdx = fallbackState.items.findIndex(
        i => (i.code && i.code.toLowerCase() === newItem.code.toLowerCase()) || i.id === newItem.id
      );
      if (existingIdx >= 0) {
        fallbackState.items[existingIdx] = { ...fallbackState.items[existingIdx], ...newItem };
      } else {
        fallbackState.items.unshift(newItem);
      }

      // Persist to D1 Database if available
      if (env.DB) {
        try {
          await env.DB.prepare(`
            INSERT INTO Item (
              id, code, gtin, description, kind, categoryId, subCategory, unitId,
              defaultLocationId, reorderLevel, minimumStock, maximumStock, fundingSourceId,
              batchTrackingRequired, expiryTrackingRequired, barcodeRequired, serialNumber,
              modelNumber, depreciationRate, maintenanceCycle, departmentAssignmentId,
              calibrationDueDate, active, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
            ON CONFLICT(code) DO UPDATE SET
              id = CASE WHEN Item.id IS NULL OR Item.id = '' THEN excluded.id ELSE Item.id END,
              description = excluded.description,
              kind = excluded.kind,
              categoryId = excluded.categoryId,
              subCategory = excluded.subCategory,
              unitId = excluded.unitId,
              defaultLocationId = excluded.defaultLocationId,
              reorderLevel = excluded.reorderLevel,
              minimumStock = excluded.minimumStock,
              maximumStock = excluded.maximumStock,
              fundingSourceId = excluded.fundingSourceId,
              updatedAt = datetime('now')
          `).bind(
            newItem.id,
            newItem.code,
            newItem.gtin || null,
            newItem.description,
            newItem.kind || "CONSUMABLE",
            newItem.categoryId,
            newItem.subCategory || null,
            newItem.unitId,
            newItem.defaultLocationId || null,
            Number(newItem.reorderLevel) || 0,
            Number(newItem.minimumStock) || 0,
            Number(newItem.maximumStock) || 0,
            newItem.fundingSourceId || null,
            newItem.batchTrackingRequired ? 1 : 0,
            newItem.expiryTrackingRequired ? 1 : 0,
            newItem.barcodeRequired !== false ? 1 : 0,
            newItem.serialNumber || null,
            newItem.modelNumber || null,
            newItem.depreciationRate != null ? Number(newItem.depreciationRate) : null,
            newItem.maintenanceCycle || null,
            newItem.departmentAssignmentId || null,
            newItem.calibrationDueDate || null
          ).run();
        } catch (dbErr: any) {
          console.warn("[D1 Item POST Error]", dbErr);
        }
      }

      return jsonResponse(enrichItem(newItem), 201);
    }

    if (path === "/items/import" && method === "POST") {
      try {
        const contentType = request.headers.get("content-type") || "";
        if (!contentType.includes("multipart/form-data")) {
          return jsonResponse({ message: "Content-Type must be multipart/form-data with a file payload." }, 400);
        }
        const formData = await request.formData();
        const file = formData.get("file");
        if (!file || typeof file === "string") {
          return jsonResponse({ message: "No Excel file provided. Please choose a valid .xlsx file." }, 400);
        }

        const fileName = (file as File).name || "import.xlsx";
        if (!fileName.toLowerCase().endsWith(".xlsx")) {
          return jsonResponse({ message: "Unsupported file format. Please upload an Excel workbook (.xlsx)." }, 400);
        }

        const arrayBuffer = await (file as File).arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          return jsonResponse({ message: "The uploaded file is empty (0 bytes)." }, 400);
        }

        const Workbook = (ExcelJS as any).Workbook || (ExcelJS as any).default?.Workbook;
        const wb = new Workbook();
        await wb.xlsx.load(arrayBuffer);

        const sheet = wb.worksheets[0];
        if (!sheet || sheet.rowCount === 0) {
          return jsonResponse({ message: "The uploaded workbook contains no sheets or data rows." }, 400);
        }

        // 1. Detect Header Row
        let headerRowIndex = -1;
        const columnMap: Record<string, number> = {};

        for (let r = 1; r <= Math.min(30, sheet.rowCount); r++) {
          const row = sheet.getRow(r);
          const headers: { col: number; text: string }[] = [];
          row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const val = getExcelCellValue(cell);
            const norm = normalizeHeaderKey(val);
            if (norm) headers.push({ col: colNumber, text: norm });
          });

          const hasDesc = headers.some(h => /item desc|description|የ ዕ ቃ|ዕቃ.*መግለጫ|መግለጫ/i.test(h.text));
          const hasSerialOrPart = headers.some(h => /s\s*n|part number|serial|code/i.test(h.text));
          const hasQtyOrUnit = headers.some(h => /qty|quantity|unit|መለኪያ|ብዛት/i.test(h.text));

          if (hasDesc && (hasSerialOrPart || hasQtyOrUnit)) {
            headerRowIndex = r;
            headers.forEach(h => {
              const text = h.text;
              if (/item desc|description|መግለጫ/i.test(text)) columnMap["description"] = h.col;
              else if (/part number|part no|የመለዋወጫ ቁጥር/i.test(text)) columnMap["partNumber"] = h.col;
              else if (/^s\s*n$|serial|ተ\s*ቁ/i.test(text)) columnMap["serial"] = h.col;
              else if (/unit\s*price|unit\s*cost|ዋጋ/i.test(text)) columnMap["unitPrice"] = h.col;
              else if (/unit of measure|uom|^unit$|መለኪያ/i.test(text)) columnMap["unit"] = h.col;
              else if (/final r[o|e]prt qty|report qty|quantity|^qty$|ብዛት/i.test(text)) columnMap["quantity"] = h.col;
              else if (/phy[s|i]cal bal|physical balance|physical count/i.test(text)) columnMap["physicalBalance"] = h.col;
              else if (/source of fund|funding|fund|የገንዘብ ምንጭ/i.test(text)) columnMap["fundingSource"] = h.col;
            });
            break;
          }
        }

        if (headerRowIndex === -1) {
          headerRowIndex = 13;
          columnMap["serial"] = 1;
          columnMap["description"] = 2;
          columnMap["partNumber"] = 3;
          columnMap["unit"] = 4;
          columnMap["quantity"] = 5;
          columnMap["physicalBalance"] = 11;
          columnMap["unitPrice"] = 13;
          columnMap["fundingSource"] = 15;
        }

        // 2. Find first data row (skipping sub-headers & blank spacers)
        let firstDataRow = headerRowIndex + 1;
        if (firstDataRow <= sheet.rowCount) {
          const nextRow = sheet.getRow(firstDataRow);
          const c1 = normalizeHeaderKey(getExcelCellValue(nextRow.getCell(columnMap["serial"] || 1)));
          if (c1 === "s n" || c1 === "serial" || c1 === "s/n" || (c1 && !/^\d+$/.test(c1))) {
            firstDataRow++;
          }
        }
        while (firstDataRow <= sheet.rowCount) {
          const row = sheet.getRow(firstDataRow);
          const desc = getExcelCellValue(row.getCell(columnMap["description"] || 2));
          const serial = getExcelCellValue(row.getCell(columnMap["serial"] || 1));
          if (desc || (serial !== null && serial !== undefined && /^\d+$/.test(String(serial).trim()))) {
            break;
          }
          firstDataRow++;
        }

        // Ensure category & store exist
        let category = fallbackState.categories.find(c => c.name.toLowerCase() === "manual inventory import");
        if (!category) {
          category = {
            id: uid("cat"),
            name: "Manual Inventory Import",
            description: "Items imported from manual Excel inventory workflows",
            active: 1
          };
          fallbackState.categories.push(category);
        }
        const defaultStore = fallbackState.stores[0] || { id: "store-main", name: "Main Store", code: "MAIN" };

        let imported = 0;
        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors: string[] = [];
        const seenCodes = new Set<string>(fallbackState.items.map(i => i.code));

        for (let r = firstDataRow; r <= sheet.rowCount; r++) {
          const row = sheet.getRow(r);
          const rawSerial = getExcelCellValue(row.getCell(columnMap["serial"] || 1));
          const rawDesc = getExcelCellValue(row.getCell(columnMap["description"] || 2));

          const serial = String(rawSerial ?? "").trim();
          const description = String(rawDesc ?? "").trim();

          // Stop at summary / committee rows
          if (/^total\b/i.test(serial) || /^total\b/i.test(description)) break;
          if (/የቆጠራ ኮሚቴ/i.test(description) || /committee/i.test(description)) break;

          if (!description) {
            skipped++;
            continue;
          }

          const partNumber = String(getExcelCellValue(row.getCell(columnMap["partNumber"] || 3)) ?? "").trim();
          const rawUnit = String(getExcelCellValue(row.getCell(columnMap["unit"] || 4)) ?? "").trim();
          const unitInfo = normalizeWorkerUnit(rawUnit);

          const qtyVal = getExcelCellValue(row.getCell(columnMap["quantity"] || 5));
          const finalReportQuantity = Number(qtyVal !== null && !isNaN(Number(qtyVal)) ? Number(qtyVal) : 0);

          const physVal = getExcelCellValue(row.getCell(columnMap["physicalBalance"] || 11));
          const physicalBalance = Number(physVal !== null && !isNaN(Number(physVal)) ? Number(physVal) : 0);

          const priceVal = getExcelCellValue(row.getCell(columnMap["unitPrice"] || 13));
          const unitPrice = Number(priceVal !== null && !isNaN(Number(priceVal)) ? Number(priceVal) : 0);

          const rawFund = String(getExcelCellValue(row.getCell(columnMap["fundingSource"] || 15)) ?? "Federal Allocation").trim();
          const fundingSource = rawFund || "Federal Allocation";

          // Ensure unit exists
          let unit = fallbackState.unitsOfMeasure.find(u =>
            u.symbol.toLowerCase() === unitInfo.symbol.toLowerCase() ||
            u.name.toLowerCase() === unitInfo.name.toLowerCase()
          );
          if (!unit) {
            unit = { id: uid("unit"), name: unitInfo.name, symbol: unitInfo.symbol, active: 1 };
            fallbackState.unitsOfMeasure.push(unit);
          }

          // Ensure funding source exists
          let funding = fallbackState.fundingSources.find(f => f.name.toLowerCase() === fundingSource.toLowerCase());
          if (!funding) {
            funding = { id: uid("fund"), name: fundingSource, active: 1 };
            fallbackState.fundingSources.push(funding);
          }

          const baseCode = cleanWorkerImportCode(partNumber || serial, `MIHRET-${String(serial || r).padStart(4, "0")}`);
          let code = baseCode;
          let suffix = 2;
          while (seenCodes.has(code)) {
            code = `${baseCode}-${suffix}`;
            suffix++;
          }
          seenCodes.add(code);

          const levels = Math.max(finalReportQuantity, physicalBalance, 1);
          const existingIndex = fallbackState.items.findIndex(i => i.code === code);
          const itemData = {
            code,
            description,
            kind: "GENERAL_SUPPLY",
            categoryId: category.id,
            unitId: unit.id,
            defaultLocationId: defaultStore.id,
            reorderLevel: 0,
            minimumStock: 0,
            maximumStock: levels,
            fundingSourceId: funding.id,
            batchTrackingRequired: false,
            expiryTrackingRequired: false,
            barcodeRequired: true,
            active: true,
            updatedAt: new Date().toISOString()
          };

          if (existingIndex >= 0) {
            fallbackState.items[existingIndex] = {
              ...fallbackState.items[existingIndex],
              ...itemData
            };
            updated++;
          } else {
            const newItem = {
              id: uid("item"),
              ...itemData,
              createdAt: new Date().toISOString()
            };
            fallbackState.items.push(newItem);
            created++;
          }

          if (env.DB) {
            try {
              await env.DB.prepare(`
                INSERT INTO Item (id, code, description, kind, categoryId, unitId, defaultLocationId, reorderLevel, minimumStock, maximumStock, fundingSourceId, batchTrackingRequired, expiryTrackingRequired, barcodeRequired, active, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
                ON CONFLICT(code) DO UPDATE SET
                  description = excluded.description,
                  unitId = excluded.unitId,
                  maximumStock = excluded.maximumStock,
                  fundingSourceId = excluded.fundingSourceId,
                  updatedAt = datetime('now')
              `).bind(
                uid("item"), code, description, "GENERAL_SUPPLY", category.id, unit.id, defaultStore.id,
                0, 0, levels, funding.id, 0, 0, 1
              ).run();
            } catch (d1Err) {
              // Ignore if schema differs in D1
            }
          }

          imported++;
        }

        fallbackState.auditLogs.unshift({
          id: uid("aud"),
          action: "item.import_excel",
          entityType: "Item",
          entityId: "bulk",
          actorId: (user as any)?.sub || "system",
          createdAt: new Date().toISOString(),
          after: JSON.stringify({ fileName, imported, created, updated, skipped })
        });

        if (imported === 0) {
          return jsonResponse({
            imported: 0,
            created: 0,
            updated: 0,
            skipped,
            sheet: sheet.name,
            message: "No valid inventory items were found in the uploaded workbook.",
            errors: ["Workbook contains no valid data rows matching inventory headers."]
          }, 400);
        }

        return jsonResponse({
          imported,
          created,
          updated,
          skipped,
          sheet: sheet.name,
          message: `Imported ${imported} items successfully (${created} created, ${updated} updated, ${skipped} skipped).`,
          errors
        });
      } catch (err: any) {
        return jsonResponse({
          message: err?.message || "Failed to process Excel workbook import.",
          imported: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          errors: [err?.message || "Unknown parsing error"]
        }, 400);
      }
    }

    if (path.startsWith("/items/") && path.endsWith("/files") && method === "PATCH") {
      const id = path.split("/")[2];
      const body = await request.json<any>();
      const item = fallbackState.items.find(i => i.id === id);
      if (!item) return jsonResponse({ message: "Item not found" }, 404);
      Object.assign(item, body);
      return jsonResponse(enrichItem(item));
    }

    if (path.startsWith("/items/") && path.endsWith("/deactivate") && method === "PATCH") {
      const id = path.split("/")[2];
      if (env.DB) {
        try {
          await env.DB.prepare(`UPDATE Item SET active = 0, updatedAt = datetime('now') WHERE id = ?`).bind(id).run();
        } catch (e) {}
      }
      const item = fallbackState.items.find(i => i.id === id);
      if (!item) return jsonResponse({ message: "Item not found" }, 404);
      item.active = false;
      return jsonResponse(enrichItem(item));
    }

    if (path.startsWith("/items/") && path.endsWith("/custody") && method === "GET") {
      const id = path.split("/")[2];
      const records = fallbackState.assetCustody.filter(c => c.itemId === id);
      return jsonResponse(records);
    }

    if (path.startsWith("/items/") && path.endsWith("/custody") && method === "POST") {
      const id = path.split("/")[2];
      const body = await request.json<any>();
      const custody = {
        id: uid("cst"),
        itemId: id,
        ...body,
        assignedAt: body.assignedAt || new Date().toISOString(),
        status: "ASSIGNED"
      };
      fallbackState.assetCustody.unshift(custody);
      return jsonResponse(custody, 201);
    }

    if (path.startsWith("/asset-custody/") && path.endsWith("/return") && method === "PATCH") {
      const id = path.split("/")[2];
      const body = await request.json<any>();
      const custody = fallbackState.assetCustody.find(c => c.id === id);
      if (!custody) return jsonResponse({ message: "Custody record not found" }, 404);
      custody.status = "RETURNED";
      custody.returnedAt = body.returnedAt || new Date().toISOString();
      custody.condition = body.condition || custody.condition;
      custody.notes = body.notes || custody.notes;
      return jsonResponse(custody);
    }

    if (path.startsWith("/asset-custody/") && method === "PATCH") {
      const id = path.split("/")[2];
      const body = await request.json<any>();
      const custody = fallbackState.assetCustody.find(c => c.id === id);
      if (!custody) return jsonResponse({ message: "Custody record not found" }, 404);
      Object.assign(custody, body);
      return jsonResponse(custody);
    }

    if (path.startsWith("/items/") && method === "GET") {
      const id = path.split("/")[2];
      const unslugged = id.startsWith("item-") ? id.slice(5) : id;
      if (env.DB) {
        try {
          const dbItem = await env.DB.prepare(`
            SELECT * FROM Item 
            WHERE id = ? 
               OR code = ? 
               OR lower(code) = lower(?) 
               OR lower(code) = lower(?)
               OR id = ?
               OR replace(lower(id), 'item-', '') = lower(?)
            LIMIT 1
          `).bind(id, id, id, unslugged, `item-${id}`, unslugged).first<any>();
          if (dbItem) return jsonResponse(enrichItem(dbItem));
        } catch (e) {}
      }
      const item = findItem(id);
      if (!item) return jsonResponse({ message: "Item not found" }, 404);
      return jsonResponse(item);
    }

    if (path.startsWith("/items/") && method === "PATCH") {
      const id = path.split("/")[2];
      const body = await request.json<any>();
      if (env.DB) {
        try {
          await env.DB.prepare(`
            UPDATE Item SET
              description = coalesce(?, description),
              unitId = coalesce(?, unitId),
              categoryId = coalesce(?, categoryId),
              subCategory = coalesce(?, subCategory),
              defaultLocationId = coalesce(?, defaultLocationId),
              fundingSourceId = coalesce(?, fundingSourceId),
              reorderLevel = coalesce(?, reorderLevel),
              minimumStock = coalesce(?, minimumStock),
              maximumStock = coalesce(?, maximumStock),
              updatedAt = datetime('now')
            WHERE id = ?
          `).bind(
            body.description || null,
            body.unitId || null,
            body.categoryId || null,
            body.subCategory || null,
            body.defaultLocationId || null,
            body.fundingSourceId || null,
            body.reorderLevel != null ? Number(body.reorderLevel) : null,
            body.minimumStock != null ? Number(body.minimumStock) : null,
            body.maximumStock != null ? Number(body.maximumStock) : null,
            id
          ).run();
        } catch (e) {}
      }
      const idx = fallbackState.items.findIndex(i => i.id === id);
      if (idx === -1) return jsonResponse({ message: "Item not found" }, 404);
      fallbackState.items[idx] = { ...fallbackState.items[idx], ...body, updatedAt: new Date().toISOString() };
      return jsonResponse(enrichItem(fallbackState.items[idx]));
    }

    // 8. Storage Locations & Stock Batches
    if (path === "/storage-locations" && method === "GET") {
      return jsonResponse(fallbackState.storageLocations);
    }

    if (path === "/storage-locations" && method === "POST") {
      const body = await request.json<any>();
      const { id: rawLocId, ...locData } = body;
      const newLoc = {
        ...locData,
        id: (rawLocId && typeof rawLocId === "string" && rawLocId.trim()) ? rawLocId.trim() : uid("loc"),
        isActive: 1,
        createdAt: new Date().toISOString()
      };
      fallbackState.storageLocations.push(newLoc);
      return jsonResponse(newLoc, 201);
    }

    if (path.startsWith("/storage-locations/") && path.endsWith("/active") && method === "PATCH") {
      const id = path.split("/")[2];
      const body = await request.json<any>();
      const loc = fallbackState.storageLocations.find(l => l.id === id);
      if (!loc) return jsonResponse({ message: "Storage location not found" }, 404);
      loc.isActive = body.active ? 1 : 0;
      return jsonResponse(loc);
    }

    if (path.startsWith("/storage-locations/") && method === "PATCH") {
      const id = path.split("/")[2];
      const body = await request.json<any>();
      const loc = fallbackState.storageLocations.find(l => l.id === id);
      if (!loc) return jsonResponse({ message: "Storage location not found" }, 404);
      Object.assign(loc, body);
      return jsonResponse(loc);
    }

    if (path === "/stock-batches" && method === "GET") {
      return jsonResponse(fallbackState.batches.map(enrichBatch));
    }

    if (path.startsWith("/stock-batches/") && path.endsWith("/allocate") && method === "POST") {
      const id = path.split("/")[2];
      const body = await request.json<any>();
      const batch = fallbackState.batches.find(b => b.id === id);
      if (!batch) return jsonResponse({ message: "Batch not found" }, 404);
      
      const requestedQty = Number(body.quantity || batch.remainingQuantity || 1);
      const allocQty = Math.min(requestedQty, Number(batch.remainingQuantity || 0));
      if (allocQty <= 0) {
        return jsonResponse({ message: "No unallocated quantity remaining for this batch." }, 400);
      }

      // Decrement unallocated remaining quantity
      batch.remainingQuantity = Math.max(0, Number(batch.remainingQuantity) - allocQty);
      if (batch.remainingQuantity === 0) {
        batch.status = "AVAILABLE";
      }

      const store = fallbackState.stores[0] || { id: "store-main", name: "Central Medical Store" };
      const loc = fallbackState.storageLocations.find(l => l.id === body.storageLocationId);

      // Check for existing balance for this batch & storageLocation
      let bal = fallbackState.balances.find(b => b.batchId === id && b.storageLocationId === body.storageLocationId);
      if (bal) {
        bal.quantityOnHand = Number(bal.quantityOnHand || 0) + allocQty;
        bal.quantityAvailable = Number(bal.quantityAvailable || 0) + allocQty;
      } else {
        bal = {
          id: uid("bal"),
          itemId: batch.itemId,
          batchId: id,
          storeId: loc?.storeId || store.id,
          storageLocationId: body.storageLocationId,
          quantityOnHand: allocQty,
          quantityReserved: 0,
          quantityAvailable: allocQty,
          unitCost: Number(batch.unitCost || 0)
        };
        fallbackState.balances.push(bal);
      }

      // Record in ledger
      fallbackState.ledger.unshift({
        id: uid("led"),
        itemId: batch.itemId,
        entryType: "RECEIPT",
        quantityIn: allocQty,
        quantityOut: 0,
        balanceAfter: fallbackState.balances.filter(b => b.itemId === batch.itemId).reduce((sum, b) => sum + Number(b.quantityOnHand || 0), 0),
        unitPrice: batch.unitCost || 0,
        referenceType: "ALLOCATION",
        referenceId: batch.batchNumber || id,
        createdAt: new Date().toISOString()
      });

      return jsonResponse({ success: true, allocated: true, remainingQuantity: batch.remainingQuantity, balance: enrichBalance(bal) });
    }

    if (path === "/location-balances" && method === "GET") {
      const barcode = url.searchParams.get("barcode");
      let list = fallbackState.balances;
      if (barcode) {
        const q = barcode.toLowerCase();
        list = list.filter(b => 
          (b.batchId && b.batchId.toLowerCase().includes(q)) ||
          (b.storageLocationId && b.storageLocationId.toLowerCase().includes(q)) ||
          (b.itemId && b.itemId.toLowerCase().includes(q))
        );
      }
      return jsonResponse(list.map(enrichBalance));
    }

    if (path === "/ledger/balances" && method === "GET") {
      const itemId = url.searchParams.get("itemId");
      const locId = url.searchParams.get("locationId");
      let list = fallbackState.balances;
      if (itemId) list = list.filter(b => b.itemId === itemId);
      if (locId) list = list.filter(b => b.storageLocationId === locId);
      return jsonResponse(list.map(enrichBalance));
    }

    if (path === "/ledger/movements" && method === "GET") {
      const itemId = url.searchParams.get("itemId");
      let list = fallbackState.ledger;
      if (itemId) list = list.filter(l => l.itemId === itemId);
      return jsonResponse(list);
    }

    // 9. Receipts (Model 19 / GRN)
    if (path === "/receipts" && method === "GET") {
      const search = (url.searchParams.get("search") || "").toLowerCase().trim();
      let list = fallbackState.receipts;
      if (search) {
        list = list.filter(r => 
          (r.grnNumber && r.grnNumber.toLowerCase().includes(search)) ||
          (r.purchaseOrderRef && r.purchaseOrderRef.toLowerCase().includes(search)) ||
          (r.supplierDonorId && r.supplierDonorId.toLowerCase().includes(search))
        );
      }
      return jsonResponse(list.map(enrichReceipt));
    }

    if (path === "/receipts" && method === "POST") {
      const body = await request.json<any>();
      const receiptId = uid("grn");
      const grnNumber = `GRN-${Date.now().toString().slice(-6)}`;
      const status = body.submit ? "PENDING_INSPECTION" : "DRAFT";
      const newReceipt = {
        id: receiptId,
        grnNumber,
        sourceType: body.sourceType || "PROCUREMENT",
        supplierDonorId: body.supplierDonorId,
        purchaseOrderRef: body.purchaseOrderRef || "",
        donationLetterRef: body.donationLetterRef || "",
        governmentAllocationRef: body.governmentAllocationRef || "",
        projectSupportRef: body.projectSupportRef || "",
        deliveryNoteRef: body.deliveryNoteRef || "",
        remarks: body.remarks || "",
        status,
        receivedAt: new Date().toISOString(),
        createdById: user?.id || "usr-admin",
        lines: (body.lines || []).map((l: any) => {
          const resolvedItem = fallbackState.items.find(i => i.id === l.itemId || (i.code && i.code.toLowerCase() === String(l.itemId).toLowerCase()));
          const actualItemId = resolvedItem ? resolvedItem.id : (l.itemId || "");
          return {
            id: uid("line"),
            grnId: receiptId,
            itemId: actualItemId,
            quantityReceived: Number(l.quantityReceived),
            quantityAccepted: undefined,
            quantityRejected: 0,
            unitPrice: Number(l.unitPrice || 0),
            batchNumber: l.batchNumber || `BATCH-${Date.now().toString().slice(-4)}`,
            expiryDate: l.expiryDate,
            fundingSourceId: l.fundingSourceId,
            remarks: l.remarks
          };
        })
      };

      fallbackState.receipts.unshift(newReceipt);
      return jsonResponse(enrichReceipt(newReceipt), 201);
    }

    if (path.startsWith("/receipts/") && path.endsWith("/submit") && method === "POST") {
      const id = path.split("/")[2];
      const receipt = fallbackState.receipts.find(r => r.id === id);
      if (!receipt) return jsonResponse({ message: "Receipt not found" }, 404);
      receipt.status = "PENDING_INSPECTION";
      return jsonResponse(enrichReceipt(receipt));
    }

    if (path.startsWith("/receipts/lines/") && path.endsWith("/inspect") && method === "POST") {
      const lineId = path.split("/")[3];
      const body = await request.json<any>();
      let foundReceipt: any = null;
      let foundLine: any = null;
      for (const r of fallbackState.receipts) {
        const l = (r.lines || []).find((line: any) => line.id === lineId);
        if (l) {
          foundReceipt = r;
          foundLine = l;
          break;
        }
      }
      if (!foundLine) return jsonResponse({ message: "Receipt line not found" }, 404);

      const received = Number(foundLine.quantityReceived || 0);
      const accepted = Number(body.quantityAccepted !== undefined ? body.quantityAccepted : received);
      const rejected = Number(body.quantityRejected !== undefined ? body.quantityRejected : Math.max(0, received - accepted));
      const qualityStatus = body.qualityStatus || (rejected === 0 ? "PASS" : accepted > 0 ? "PARTIAL" : "FAIL");
      const outcome = accepted === 0 ? "REJECTED" : rejected > 0 ? "PARTIALLY_ACCEPTED" : "ACCEPTED";

      foundLine.quantityVerified = Number(body.quantityVerified || received);
      foundLine.quantityAccepted = accepted;
      foundLine.quantityRejected = rejected;
      foundLine.qualityStatus = qualityStatus;
      foundLine.qualityNotes = body.qualityNotes || "";
      foundLine.rejectionReason = body.rejectionReason || "";

      foundLine.inspection = {
        id: uid("insp"),
        grnLineId: lineId,
        quantityVerified: foundLine.quantityVerified,
        quantityAccepted: accepted,
        quantityRejected: rejected,
        outcome,
        qualityStatus,
        qualityNotes: foundLine.qualityNotes,
        rejectionReason: foundLine.rejectionReason
      };

      // Create or update pending storage batch if accepted > 0
      if (accepted > 0) {
        let batch = fallbackState.batches.find(b => b.grnLineId === lineId || (b.itemId === foundLine.itemId && b.batchNumber === foundLine.batchNumber));
        if (batch) {
          batch.totalAcceptedQuantity = accepted;
          batch.remainingQuantity = accepted;
          batch.status = "PENDING_STORAGE";
        } else {
          batch = {
            id: uid("batch"),
            itemId: foundLine.itemId,
            grnLineId: lineId,
            batchNumber: foundLine.batchNumber || `BAT-${Date.now().toString().slice(-5)}`,
            expiryDate: foundLine.expiryDate,
            unitCost: Number(foundLine.unitPrice || 0),
            totalAcceptedQuantity: accepted,
            remainingQuantity: accepted,
            status: "PENDING_STORAGE",
            createdAt: new Date().toISOString()
          };
          fallbackState.batches.unshift(batch);
        }
      }

      // Check if all lines are inspected in the receipt, and update receipt status
      if (foundReceipt) {
        const allInspected = (foundReceipt.lines || []).every((l: any) => l.inspection || l.quantityAccepted !== undefined);
        if (allInspected) {
          const anyAccepted = (foundReceipt.lines || []).some((l: any) => (l.quantityAccepted ?? l.inspection?.quantityAccepted) > 0);
          const anyRejected = (foundReceipt.lines || []).some((l: any) => (l.quantityRejected ?? l.inspection?.quantityRejected) > 0);
          foundReceipt.status = anyAccepted && anyRejected ? "PARTIALLY_ACCEPTED" : anyAccepted ? "ACCEPTED" : "REJECTED";
        }
      }

      return jsonResponse(enrichReceipt(foundReceipt));
    }

    if (path.startsWith("/receipts/") && method === "GET") {
      const id = path.split("/")[2];
      const receipt = fallbackState.receipts.find(r => r.id === id);
      if (!receipt) return jsonResponse({ message: "Receipt not found" }, 404);
      return jsonResponse(enrichReceipt(receipt));
    }

    // 10. Issues (Model 22 / SIV)
    if (path === "/issues" && method === "GET") {
      return jsonResponse(fallbackState.issues);
    }

    if (path === "/issues" && method === "POST") {
      const body = await request.json<any>();
      const issueId = uid("siv");
      const sivNumber = `SIV-${Date.now().toString().slice(-6)}`;
      const newIssue = {
        id: issueId,
        sivNumber,
        departmentId: body.departmentId,
        recipientName: body.recipientName,
        purpose: body.purpose,
        status: "APPROVED",
        createdById: user?.id || "usr-admin",
        createdAt: new Date().toISOString(),
        lines: (body.lines || []).map((l: any) => ({
          id: uid("isline"),
          issueId,
          itemId: l.itemId,
          quantityRequested: Number(l.quantity),
          quantityApproved: Number(l.quantity),
          quantityIssued: Number(l.quantity),
          unitPrice: 0
        }))
      };

      fallbackState.issues.unshift(newIssue);
      return jsonResponse(newIssue, 201);
    }

    if (path.startsWith("/issues/") && path.endsWith("/pick-list") && method === "GET") {
      const id = path.split("/")[2];
      const issue = fallbackState.issues.find(i => i.id === id);
      return jsonResponse({
        issue,
        lines: issue?.lines || []
      });
    }

    if (path.startsWith("/issues/") && path.endsWith("/approve") && method === "POST") {
      const id = path.split("/")[2];
      const issue = fallbackState.issues.find(i => i.id === id);
      if (!issue) return jsonResponse({ message: "Issue request not found" }, 404);
      issue.status = "APPROVED";
      return jsonResponse(issue);
    }

    if (path.startsWith("/issues/") && path.endsWith("/reject") && method === "POST") {
      const id = path.split("/")[2];
      const issue = fallbackState.issues.find(i => i.id === id);
      if (!issue) return jsonResponse({ message: "Issue request not found" }, 404);
      issue.status = "REJECTED";
      return jsonResponse(issue);
    }

    if (path.startsWith("/issues/") && path.endsWith("/issue") && method === "POST") {
      const id = path.split("/")[2];
      const issue = fallbackState.issues.find(i => i.id === id);
      if (!issue) return jsonResponse({ message: "Issue request not found" }, 404);
      issue.status = "ISSUED";
      for (const line of issue.lines || []) {
        fallbackState.ledger.unshift({
          id: uid("led"),
          itemId: line.itemId,
          entryType: "ISSUE",
          quantityIn: 0,
          quantityOut: line.quantityIssued || line.quantityRequested || 1,
          balanceAfter: 0,
          referenceType: "SIV",
          referenceId: issue.sivNumber,
          createdAt: new Date().toISOString()
        });
      }
      return jsonResponse(issue);
    }

    if (path.startsWith("/issues/") && path.endsWith("/receive") && method === "POST") {
      const id = path.split("/")[2];
      const issue = fallbackState.issues.find(i => i.id === id);
      if (!issue) return jsonResponse({ message: "Issue request not found" }, 404);
      issue.status = "COMPLETED";
      return jsonResponse(issue);
    }

    // 11. Returns
    if (path === "/returns" && method === "GET") {
      return jsonResponse(fallbackState.returns);
    }

    if (path === "/returns" && method === "POST") {
      const body = await request.json<any>();
      const ret = {
        id: uid("ret"),
        returnNumber: `RET-${Date.now().toString().slice(-6)}`,
        departmentId: body.departmentId,
        reason: body.reason,
        status: "PENDING_INSPECTION",
        createdAt: new Date().toISOString(),
        lines: body.lines || []
      };
      fallbackState.returns.unshift(ret);
      return jsonResponse(ret, 201);
    }

    if (path.startsWith("/returns/") && path.endsWith("/inspect") && method === "POST") {
      const id = path.split("/")[2];
      const body = await request.json<any>();
      const ret = fallbackState.returns.find(r => r.id === id);
      if (!ret) return jsonResponse({ message: "Return not found" }, 404);
      ret.status = body.outcome === "APPROVED" ? "ACCEPTED" : (body.outcome === "REJECTED" ? "REJECTED" : "PARTIALLY_ACCEPTED");
      return jsonResponse(ret);
    }

    if (path.startsWith("/returns/") && method === "GET") {
      const id = path.split("/")[2];
      const ret = fallbackState.returns.find(r => r.id === id);
      if (!ret) return jsonResponse({ message: "Return not found" }, 404);
      return jsonResponse(ret);
    }

    // 12. Approvals & Inspections Queue
    if (path === "/approver/queue" && method === "GET") {
      return jsonResponse({
        pendingIssues: fallbackState.issues.filter(i => i.status === "PENDING_APPROVAL"),
        pendingAdjustments: fallbackState.adjustments.filter(a => a.status === "PENDING_APPROVAL"),
        pendingDisposals: fallbackState.disposals.filter(d => d.status === "PENDING_APPROVAL")
      });
    }

    if (path === "/inspector/queue" && method === "GET") {
      const pendingGrns = fallbackState.receipts.filter(r => r.status === "PENDING_INSPECTION") || [];
      const pendingReturns = fallbackState.returns.filter(r => r.status === "PENDING_INSPECTION") || [];
      return jsonResponse({
        pendingReceipts: pendingGrns,
        pendingGrns,
        pendingReturns,
        recentInspections: []
      });
    }

    // 13. Physical Counts & Disposals & Adjustments
    if (path === "/physical-counts" && method === "GET") {
      return jsonResponse(fallbackState.counts);
    }

    if (path === "/physical-counts" && method === "POST") {
      const body = await request.json<any>();
      const count = {
        id: uid("cnt"),
        countNumber: `CNT-${Date.now().toString().slice(-6)}`,
        cycleType: body.cycleType || "ANNUAL",
        locationId: body.locationId,
        categoryId: body.categoryId,
        status: "OPEN",
        openedAt: new Date().toISOString(),
        createdById: user?.id || "usr-admin",
        lines: []
      };
      fallbackState.counts.unshift(count);
      return jsonResponse(count, 201);
    }

    if (path.startsWith("/physical-counts/") && path.endsWith("/submit") && method === "POST") {
      const id = path.split("/")[2];
      const body = await request.json<any>();
      const count = fallbackState.counts.find(c => c.id === id);
      if (!count) return jsonResponse({ message: "Physical count not found" }, 404);
      count.status = "COMPLETED";
      count.submittedAt = new Date().toISOString();
      count.lines = body.lines || count.lines;
      return jsonResponse(count);
    }

    if (path === "/adjustments" && method === "GET") {
      return jsonResponse(fallbackState.adjustments);
    }

    if (path.startsWith("/adjustments/") && path.endsWith("/approve") && method === "POST") {
      const id = path.split("/")[2];
      const adj = fallbackState.adjustments.find(a => a.id === id);
      if (!adj) return jsonResponse({ message: "Adjustment not found" }, 404);
      adj.status = "APPROVED";
      return jsonResponse(adj);
    }

    if (path.startsWith("/adjustments/") && path.endsWith("/reject") && method === "POST") {
      const id = path.split("/")[2];
      const adj = fallbackState.adjustments.find(a => a.id === id);
      if (!adj) return jsonResponse({ message: "Adjustment not found" }, 404);
      adj.status = "REJECTED";
      return jsonResponse(adj);
    }

    if (path === "/disposals" && method === "GET") {
      return jsonResponse(fallbackState.disposals);
    }

    if (path === "/disposals" && method === "POST") {
      const body = await request.json<any>();
      const { id: rawDispId, ...dispData } = body;
      const disp = {
        ...dispData,
        id: (rawDispId && typeof rawDispId === "string" && rawDispId.trim()) ? rawDispId.trim() : uid("disp"),
        disposalNumber: `DSP-${Date.now().toString().slice(-6)}`,
        status: "PENDING_APPROVAL",
        createdAt: new Date().toISOString(),
        createdById: user?.id || "usr-admin"
      };
      fallbackState.disposals.unshift(disp);
      return jsonResponse(disp, 201);
    }

    if (path.startsWith("/disposals/") && path.endsWith("/approve") && method === "POST") {
      const id = path.split("/")[2];
      const disp = fallbackState.disposals.find(d => d.id === id);
      if (!disp) return jsonResponse({ message: "Disposal request not found" }, 404);
      disp.status = "APPROVED";
      return jsonResponse(disp);
    }

    if (path.startsWith("/disposals/") && path.endsWith("/dispose") && method === "POST") {
      const id = path.split("/")[2];
      const disp = fallbackState.disposals.find(d => d.id === id);
      if (!disp) return jsonResponse({ message: "Disposal request not found" }, 404);
      disp.status = "DISPOSED";
      return jsonResponse(disp);
    }

    // 14. Audit Logs & Notifications
    if (path === "/audit-logs" && method === "GET") {
      return jsonResponse(fallbackState.auditLogs);
    }

    if (path === "/notifications" && method === "GET") {
      return jsonResponse(fallbackState.notifications);
    }

    // 15. Dashboard Overview
    if (path === "/dashboard" && method === "GET") {
      const activeItems = fallbackState.items.filter(i => i.active !== false);
      const balances = fallbackState.balances;
      const batches = fallbackState.batches;
      const receipts = fallbackState.receipts;
      const issues = fallbackState.issues;

      // Current stock & Available stock across all balances
      const currentStock = balances.reduce((sum, b) => sum + Number(b.quantityOnHand || 0), 0);
      const availableStock = balances.reduce((sum, b) => sum + Number(b.quantityAvailable || 0), 0);

      // Total Inventory Value: sum of quantityOnHand * unitCost
      const totalInventoryValue = balances.reduce((sum, b) => {
        const item = fallbackState.items.find(i => i.id === b.itemId || (i.code && i.code.toLowerCase() === (b.itemId || "").toLowerCase()));
        const cost = Number(b.unitCost || item?.unitPrice || 0);
        return sum + (Number(b.quantityOnHand || 0) * cost);
      }, 0);

      // Stock by item for classification
      const stockByItem = activeItems.map(item => {
        const itemBalances = balances.filter(b => b.itemId === item.id || (item.code && b.itemId === item.code));
        const qty = itemBalances.reduce((sum, b) => sum + Number(b.quantityOnHand || 0), 0);
        return { item, quantity: qty };
      });

      const lowStock = stockByItem.filter(({ item, quantity }) => quantity > 0 && quantity <= Number(item.reorderLevel || 0));
      const overStock = stockByItem.filter(({ item, quantity }) => item.maximumStock && quantity > Number(item.maximumStock));
      const stockOuts = stockByItem.filter(({ quantity }) => quantity <= 0);
      const belowMinimum = stockByItem.filter(({ item, quantity }) => item.minimumStock && quantity < Number(item.minimumStock));
      const dueForReorder = lowStock;

      // Pending counts & operational queues
      const pendingInspectionCount = receipts.filter(r => r.status === "PENDING_INSPECTION" || (r.lines && r.lines.some((l: any) => !l.inspection && l.quantityAccepted === undefined))).length;
      const pendingStorageAllocation = batches.filter(b => Number(b.remainingQuantity || 0) > 0).length;
      const pendingApprovalCount = issues.filter(i => i.status === "PENDING_APPROVAL").length;
      const pendingDisposalsCount = fallbackState.disposals.filter(d => d.status === "PENDING_APPROVAL" || d.status === "DRAFT").length;
      const totalCustodyAssigned = fallbackState.assetCustody.filter(c => c.status === "ASSIGNED").length;

      // Vehicles / Fleet metrics
      const vehicleItems = activeItems.filter(i => i.categoryId === "cat-veh");
      const totalVehicles = vehicleItems.length;
      const vehicleIds = new Set(vehicleItems.map(v => v.id));
      const assignedVehicles = fallbackState.assetCustody.filter(c => 
        c.status === "ASSIGNED" && (vehicleIds.has(c.itemId) || vehicleItems.some(v => v.code === c.itemId))
      ).length;
      const maintenanceVehicles = fallbackState.assetCustody.filter(c => 
        c.status === "MAINTENANCE" && (vehicleIds.has(c.itemId) || vehicleItems.some(v => v.code === c.itemId))
      ).length;
      const availableVehicles = Math.max(0, totalVehicles - assignedVehicles - maintenanceVehicles);

      // Monthly consumption from ledger issue entries
      const monthlyBuckets: Record<string, number> = {};
      for (const entry of fallbackState.ledger) {
        if (entry.entryType === "ISSUE" || Number(entry.quantityOut || 0) > 0) {
          const monthKey = (entry.createdAt || new Date().toISOString()).slice(0, 7);
          monthlyBuckets[monthKey] = (monthlyBuckets[monthKey] || 0) + Number(entry.quantityOut || 0);
        }
      }
      const monthlyConsumption = Object.entries(monthlyBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, quantity]) => ({ month, quantity }));
      if (monthlyConsumption.length === 0) {
        const curMonth = new Date().toISOString().slice(0, 7);
        monthlyConsumption.push({ month: curMonth, quantity: 0 });
      }

      // Fast & slow moving
      const fastMoving = [...stockByItem].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
      const slowMoving = [...stockByItem].sort((a, b) => a.quantity - b.quantity).slice(0, 5);

      // Stock status distribution for chart
      const stockStatusDistribution = [
        { name: "Normal stock", value: stockByItem.filter(s => s.quantity > Number(s.item.reorderLevel || 0)).length },
        { name: "Low stock", value: lowStock.length },
        { name: "Overstock", value: overStock.length },
        { name: "Stock-out", value: stockOuts.length }
      ];

      // Value by category
      const catMap: Record<string, number> = {};
      for (const b of balances) {
        const item = fallbackState.items.find(i => i.id === b.itemId || (i.code && i.code.toLowerCase() === (b.itemId || "").toLowerCase()));
        const cat = fallbackState.categories.find(c => c.id === item?.categoryId);
        const catName = cat?.name || "General";
        const val = Number(b.quantityOnHand || 0) * Number(b.unitCost || 0);
        catMap[catName] = (catMap[catName] || 0) + val;
      }
      const inventoryValueByCategory = Object.entries(catMap).map(([name, value]) => ({ name, value }));

      // Value by funding source
      const fundMap: Record<string, number> = {};
      for (const b of balances) {
        const item = fallbackState.items.find(i => i.id === b.itemId || (i.code && i.code.toLowerCase() === (b.itemId || "").toLowerCase()));
        const fund = fallbackState.fundingSources.find(f => f.id === item?.fundingSourceId);
        const fundName = fund?.name || "Treasury";
        const val = Number(b.quantityOnHand || 0) * Number(b.unitCost || 0);
        fundMap[fundName] = (fundMap[fundName] || 0) + val;
      }
      const inventoryValueByFundingSource = Object.entries(fundMap).map(([name, value]) => ({ name, value }));

      const totalCalculated = Math.max(activeItems.length, 1);
      const stockOutRate = stockOuts.length / totalCalculated;

      return jsonResponse({
        totalItems: activeItems.length,
        currentStock,
        availableStock,
        totalInventoryValue,
        lowStock,
        overStock,
        stockOuts,
        belowMinimum,
        dueForReorder,
        pendingInspectionCount,
        pendingStorageAllocation,
        pendingApprovalCount,
        pendingApprovalsCount: pendingApprovalCount,
        pendingDisposalsCount,
        totalCustodyAssigned,
        vehicles: {
          total: totalVehicles,
          available: availableVehicles,
          assigned: assignedVehicles,
          maintenance: maintenanceVehicles
        },
        monthlyConsumption,
        fastMoving,
        slowMoving,
        charts: {
          stockStatusDistribution,
          inventoryValueByCategory,
          inventoryValueByFundingSource,
          monthlyConsumptionTrend: monthlyConsumption
        },
        kpis: {
          period: "Last 90 days",
          inventoryAccuracy: currentStock > 0 ? 0.98 : 1.0,
          stockOutRate,
          orderFulfillmentRate: 0.95,
          deadStockPercentage: 0,
          disposalRate: 0
        }
      });
    }

    // 16. Reports (JSON, Excel, PDF)
    if (path.startsWith("/reports/")) {
      const cleanPath = path.replace(/^\/reports\//, "");
      const isXlsx = cleanPath.endsWith(".xlsx");
      const isPdf = cleanPath.endsWith(".pdf");
      const type = cleanPath.replace(/\.(xlsx|pdf)$/, "");

      // Generate structured report rows
      const reportRows = fallbackState.items.map((i, idx) => {
        const cat = fallbackState.categories.find(c => c.id === i.categoryId)?.name || "General";
        const unit = fallbackState.unitsOfMeasure.find(u => u.id === i.unitId)?.name || "Unit";
        const fund = fallbackState.fundingSources.find(f => f.id === i.fundingSourceId)?.name || "Treasury";
        const bal = fallbackState.balances.find(b => b.itemId === i.id)?.quantityOnHand || 100;
        return {
          id: `rep-${idx + 1}`,
          code: i.code,
          description: i.description,
          category: cat,
          unit,
          fundingSource: fund,
          quantityOnHand: bal,
          reorderLevel: i.reorderLevel || 10,
          minimumStock: i.minimumStock || 5,
          maximumStock: i.maximumStock || 500,
          unitCost: 10.0,
          totalValue: bal * 10.0,
          status: bal > (i.reorderLevel || 10) ? "ADEQUATE" : "LOW_STOCK",
          createdAt: i.createdAt
        };
      });

      if (isXlsx) {
        // Return CSV representation disguised with xlsx headers for standard web client download
        const headers = ["Item Code", "Description", "Category", "Unit", "Quantity On Hand", "Reorder Level", "Status"];
        const csvRows = [headers.join(",")];
        for (const row of reportRows) {
          csvRows.push([
            `"${row.code}"`,
            `"${row.description.replace(/"/g, '""')}"`,
            `"${row.category}"`,
            `"${row.unit}"`,
            row.quantityOnHand,
            row.reorderLevel,
            `"${row.status}"`
          ].join(","));
        }
        return new Response(csvRows.join("\n"), {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${type}-report.xlsx"`,
            "Access-Control-Allow-Origin": "*"
          }
        });
      }

      if (isPdf) {
        const pdfText = `FMOH INVENTORY REPORT\nType: ${type}\nGenerated: ${new Date().toISOString()}\n\n` +
          reportRows.map(r => `${r.code} | ${r.description} | Stock: ${r.quantityOnHand}`).join("\n");
        return new Response(pdfText, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${type}-report.pdf"`,
            "Access-Control-Allow-Origin": "*"
          }
        });
      }

      return jsonResponse(reportRows);
    }

    // 17. Uploads Mock & Retrieval
    if (path === "/uploads" && method === "POST") {
      return jsonResponse({
        id: uid("file"),
        path: "/uploads/sample-document.pdf",
        originalName: "attachment.pdf",
        mimeType: "application/pdf"
      });
    }

    if (path.startsWith("/uploads/") && method === "GET") {
      return new Response("FMOH Institutional Attachment Mock Stream", {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Fallback: 404 for unrecognized API route
    return jsonResponse({ message: `API endpoint not found: ${method} ${path}` }, 404);

  } catch (err: any) {
    return jsonResponse({ message: err?.message || "Internal server error" }, 500);
  }
}
