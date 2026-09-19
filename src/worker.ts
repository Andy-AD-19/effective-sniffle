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

  fallbackState.issues = [
    {
      id: "siv-seed-01",
      sivNumber: "SIV-2026-001",
      departmentId: "dept-eng",
      recipientName: "Eng. Samuel K.",
      purpose: "Urgent facility generator repair and maintenance",
      status: "PENDING_APPROVAL",
      createdById: "usr-storekeeper",
      createdAt: new Date().toISOString(),
      lines: [
        {
          id: "isline-seed-1",
          issueId: "siv-seed-01",
          itemId: "item-screw",
          quantity: 5,
          quantityRequested: 5,
          quantityApproved: 0,
          quantityIssued: 0,
          unitPrice: 18.5
        }
      ]
    }
  ];

  fallbackState.adjustments = [
    {
      id: "adj-seed-01",
      adjustmentNumber: "ADJ-2026-001",
      itemId: "item-gen-15kva",
      batchId: "batch-gen-01",
      storeId: "store-main",
      type: "GAIN",
      quantity: 1,
      quantityDelta: 1,
      reason: "Found during annual inventory count reconciliation",
      status: "PENDING_APPROVAL",
      createdById: "usr-storekeeper",
      createdAt: new Date().toISOString()
    }
  ];

  fallbackState.disposals = [
    {
      id: "disp-seed-01",
      disposalNumber: "DSP-2026-001",
      itemId: "item-screw",
      batchId: "batch-screw-01",
      reasonId: "OBSOLETE",
      reason: "Damaged during store reorganization",
      status: "PENDING_APPROVAL",
      createdById: "usr-storekeeper",
      createdAt: new Date().toISOString(),
      lines: [
        {
          itemId: "item-screw",
          batchId: "batch-screw-01",
          storageLocationId: "loc-01",
          storeId: "store-main",
          quantity: 2,
          batchNumber: "MNT-2026-01"
        }
      ]
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
async function parseAuthUser(request: Request, secret: string): Promise<any | null> {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const parts = token.split(".");
    if (parts.length < 3) return null;
    
    // Validate signature
    const headerPayload = parts[0] + "." + parts[1];
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    // Decode base64url signature
    const sigString = atob(parts[2].replace(/-/g, "+").replace(/_/g, "/"));
    const sigBytes = new Uint8Array(sigString.length);
    for (let i = 0; i < sigString.length; i++) {
      sigBytes[i] = sigString.charCodeAt(i);
    }
    
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(headerPayload)
    );
    
    if (!isValid) return null;
    
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    console.error("[JWT Error]", e);
    return null;
  }
}

// Auto-ID generator
function getPathSegment(path: string, index: number): string {
  return path.split("/").filter(Boolean)[index] || "";
}

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

function resolveItemFallback(itemId: string, existingItem?: any, descriptionHint?: string, codeHint?: string): any {
  const found = findItem(itemId);
  if (found) return found;

  const candidateDesc = descriptionHint || existingItem?.description;
  const isDescGeneric = !candidateDesc || 
    candidateDesc.startsWith("Item item-") || 
    candidateDesc === `Item ${itemId}` || 
    candidateDesc === "Institutional Item";

  const candidateCode = codeHint || existingItem?.code || (itemId ? String(itemId).replace(/^item-/, "") : "");

  if (candidateCode && candidateCode !== itemId) {
    const byCode = findItem(candidateCode);
    if (byCode) return byCode;
  }

  if (existingItem && existingItem.description && !isDescGeneric) {
    return {
      ...existingItem,
      id: existingItem.id || itemId,
      code: candidateCode || itemId,
      description: existingItem.description
    };
  }

  if (descriptionHint && !isDescGeneric) {
    return {
      id: itemId,
      code: candidateCode || itemId,
      description: descriptionHint
    };
  }

  return {
    id: itemId,
    code: candidateCode || itemId,
    description: (candidateDesc && !isDescGeneric) ? candidateDesc : (candidateCode || "Institutional Item")
  };
}

function enrichBatch(batch: any): any {
  if (!batch) return batch;
  const item = resolveItemFallback(batch.itemId, batch.item, batch.itemDescription, batch.itemCode);
  return {
    ...batch,
    item
  };
}

function enrichBalance(balance: any): any {
  if (!balance) return balance;
  const item = resolveItemFallback(balance.itemId, balance.item, balance.itemDescription, balance.itemCode);
  const batch = fallbackState.batches.find(b => b.id === balance.batchId) || null;
  const store = fallbackState.stores.find(s => s.id === balance.storeId) || fallbackState.stores[0] || null;
  const storageLocation = fallbackState.storageLocations.find(l => l.id === balance.storageLocationId) || null;

  return {
    ...balance,
    item,
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
    const item = resolveItemFallback(line.itemId, line.item, line.itemDescription, line.itemCode);
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
      item,
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

function enrichIssue(issue: any): any {
  if (!issue) return issue;
  const dept = fallbackState.departments.find(d => d.id === issue.departmentId) || null;
  const user = fallbackState.users.find(u => u.id === issue.createdById) || null;
  const lines = (issue.lines || []).map((line: any) => {
    const item = resolveItemFallback(line.itemId, line.item, line.itemDescription, line.itemCode);
    const qty = Number(line.quantity ?? line.quantityRequested ?? line.quantityApproved ?? 0);
    return {
      ...line,
      quantity: qty,
      quantityRequested: Number(line.quantityRequested ?? qty),
      issuedQuantity: Number(line.quantityIssued ?? 0),
      item
    };
  });

  return {
    ...issue,
    requestNumber: issue.requestNumber || issue.sivNumber || issue.id,
    department: dept || (issue.departmentId ? { id: issue.departmentId, name: issue.departmentId } : null),
    departmentName: dept?.name || issue.departmentName || issue.departmentId || "General Department",
    requestedBy: user || { id: issue.createdById || "usr-admin", fullName: user?.fullName || issue.recipientName || "Store Requester" },
    voucher: (issue.status === "ISSUED" || issue.status === "PARTIALLY_ISSUED" || issue.status === "CLOSED") ? {
      voucherNumber: issue.sivNumber || issue.id,
      issuedAt: issue.updatedAt || issue.createdAt,
      createdAt: issue.createdAt,
      issuedBy: fallbackState.users.find(u => u.id === issue.issuedById) || { fullName: "Storekeeper" },
      ledgerEntries: fallbackState.ledger.filter(l => l.referenceId === issue.sivNumber || l.referenceId === issue.id)
    } : null,
    lines
  };
}

function enrichAdjustment(adj: any): any {
  if (!adj) return adj;
  const item = resolveItemFallback(adj.itemId, adj.item, adj.itemDescription, adj.itemCode);
  const user = fallbackState.users.find(u => u.id === adj.createdById) || null;
  const batch = fallbackState.batches.find(b => b.id === adj.batchId) || null;
  const qty = Number(adj.quantity ?? adj.quantityDelta ?? 0);

  return {
    ...adj,
    quantity: qty,
    quantityDelta: Number(adj.quantityDelta ?? qty),
    item,
    batch: batch ? enrichBatch(batch) : (adj.batch || { id: adj.batchId, batchNumber: adj.batchNumber || "N/A" }),
    requestedBy: user || { id: adj.createdById || "usr-admin", fullName: user?.fullName || "Inventory Officer" }
  };
}

function enrichDisposal(disp: any): any {
  if (!disp) return disp;
  const user = fallbackState.users.find(u => u.id === disp.createdById) || null;
  const reason = fallbackState.disposalReasons.find(r => r.id === disp.reasonId) || null;

  const lines = (disp.lines || []).map((line: any) => {
    const item = resolveItemFallback(line.itemId, line.item, line.itemDescription, line.itemCode);
    const batch = fallbackState.batches.find(b => b.id === line.batchId) || null;
    return {
      ...line,
      quantity: Number(line.quantity ?? 1),
      item,
      batch: batch ? enrichBatch(batch) : (line.batch || { id: line.batchId, batchNumber: line.batchNumber || "N/A" })
    };
  });

  let topItem = null;
  if (disp.itemId) {
    topItem = resolveItemFallback(disp.itemId, null, disp.itemDescription, disp.itemCode);
  } else if (lines.length > 0 && lines[0].item) {
    topItem = lines[0].item;
  }

  const batch = fallbackState.batches.find(b => b.id === disp.batchId) || (lines.length > 0 ? lines[0].batch : null);

  const effectiveLines = lines.length > 0 ? lines : (topItem ? [{
    itemId: disp.itemId,
    item: topItem,
    quantity: Number(disp.quantity || 1),
    batch
  }] : []);

  return {
    ...disp,
    item: topItem,
    batch: batch ? enrichBatch(batch) : (disp.batch || { id: disp.batchId, batchNumber: disp.batchNumber || "N/A" }),
    lines: effectiveLines,
    disposalReason: reason || (disp.reasonId ? { id: disp.reasonId, code: disp.reasonId, description: disp.reason || disp.reasonId } : null),
    requestedBy: user || { id: disp.createdById || "usr-admin", fullName: user?.fullName || "Inventory Officer" }
  };
}

function enrichReturn(ret: any): any {
  if (!ret) return ret;
  const dept = fallbackState.departments.find(d => d.id === ret.departmentId) || null;
  const lines = (ret.lines || []).map((line: any) => {
    const item = resolveItemFallback(line.itemId, line.item, line.itemDescription, line.itemCode);
    return {
      ...line,
      quantity: Number(line.quantity ?? line.quantityReturned ?? 1),
      item
    };
  });

  return {
    ...ret,
    department: dept || (ret.departmentId ? { id: ret.departmentId, name: ret.departmentId } : null),
    departmentName: dept?.name || ret.departmentId || "General Department",
    lines
  };
}

function enrichLedgerEntry(entry: any): any {
  if (!entry) return entry;
  const item = resolveItemFallback(entry.itemId, entry.item, entry.itemDescription, entry.itemCode);
  return {
    ...entry,
    item
  };
}

async function getOrFetchReceipt(id: string, env: Env): Promise<any> {
  let receipt = fallbackState.receipts.find(r => r.id === id || r.grnNumber === id);
  if (env.DB && (!receipt || !receipt.lines || receipt.lines.length === 0)) {
    try {
      const dbNote = await env.DB.prepare(
        "SELECT * FROM GoodsReceivingNote WHERE id = ? OR grnNumber = ?"
      ).bind(id, id).first<any>();
      if (dbNote) {
        const linesQuery = await env.DB.prepare(`
          SELECT l.*, i.code AS itemCode, i.description AS itemDescription, i.unitId, i.categoryId, i.modelNumber, i.serialNumber
          FROM GoodsReceivingLine l
          LEFT JOIN Item i ON l.itemId = i.id OR l.itemId = i.code
          WHERE l.grnId = ?
        `).bind(dbNote.id).all<any>();

        let inspections: any[] = [];
        try {
          const inspRes = await env.DB.prepare(
            "SELECT * FROM Inspection WHERE grnLineId IN (SELECT id FROM GoodsReceivingLine WHERE grnId = ?)"
          ).bind(dbNote.id).all<any>();
          inspections = inspRes.results || [];
        } catch (e) { console.error("[D1 Error]", e); }

        const lines = (linesQuery.results || []).map((l: any) => {
          const insp = inspections.find((ins: any) => ins.grnLineId === l.id);
          const accepted = l.quantityAccepted !== null && l.quantityAccepted !== undefined ? Number(l.quantityAccepted) : insp ? Number(insp.quantityAccepted) : undefined;
          const rejected = l.quantityRejected !== null && l.quantityRejected !== undefined ? Number(l.quantityRejected) : insp ? Number(insp.quantityRejected) : 0;
          return {
            ...l,
            quantityReceived: Number(l.quantityReceived || 0),
            quantityAccepted: accepted,
            quantityRejected: rejected,
            unitPrice: Number(l.unitPrice || 0),
            inspection: insp || (accepted !== undefined ? {
              id: l.id + "-insp",
              grnLineId: l.id,
              quantityVerified: Number(l.quantityReceived || 0),
              quantityAccepted: accepted,
              quantityRejected: rejected,
              outcome: accepted === 0 ? "REJECTED" : rejected > 0 ? "PARTIALLY_ACCEPTED" : "ACCEPTED",
              qualityStatus: l.qualityStatus || "PASS"
            } : null)
          };
        });

        const fetched = {
          ...dbNote,
          lines
        };

        const existingIdx = fallbackState.receipts.findIndex(r => r.id === dbNote.id);
        if (existingIdx >= 0) {
          fallbackState.receipts[existingIdx] = fetched;
        } else {
          fallbackState.receipts.unshift(fetched);
        }
        receipt = fetched;
      }
    } catch (err) {
      console.warn("[getOrFetchReceipt Error]", err);
    }
  }
  return receipt || null;
}

async function getOrFetchIssue(id: string, env: Env): Promise<any> {
  let issue = fallbackState.issues.find(i => i.id === id || i.sivNumber === id);
  if (env.DB && (!issue || !issue.lines || issue.lines.length === 0)) {
    try {
      const dbVoucher = await env.DB.prepare(
        "SELECT * FROM StockIssueVoucher WHERE id = ? OR sivNumber = ?"
      ).bind(id, id).first<any>();
      if (dbVoucher) {
        const linesQuery = await env.DB.prepare(`
          SELECT l.*, i.code AS itemCode, i.description AS itemDescription
          FROM StockIssueLine l
          LEFT JOIN Item i ON l.itemId = i.id OR l.itemId = i.code
          WHERE l.issueId = ?
        `).bind(dbVoucher.id).all<any>();

        const lines = (linesQuery.results || []).map((l: any) => ({
          ...l,
          quantity: Number(l.quantityRequested || l.quantity || 0),
          quantityRequested: Number(l.quantityRequested || l.quantity || 0),
          quantityApproved: Number(l.quantityApproved || 0),
          quantityIssued: Number(l.quantityIssued || 0),
          unitPrice: Number(l.unitPrice || 0)
        }));

        const fetched = {
          ...dbVoucher,
          requestNumber: dbVoucher.sivNumber,
          lines
        };

        const existingIdx = fallbackState.issues.findIndex(i => i.id === dbVoucher.id);
        if (existingIdx >= 0) {
          fallbackState.issues[existingIdx] = fetched;
        } else {
          fallbackState.issues.unshift(fetched);
        }
        issue = fetched;
      }
    } catch (err) {
      console.warn("[getOrFetchIssue Error]", err);
    }
  }
  return issue || null;
}

async function getOrFetchReturn(id: string, env: Env): Promise<any> {
  let ret = fallbackState.returns.find(r => r.id === id || r.returnNumber === id);
  if (env.DB && (!ret || !ret.lines || ret.lines.length === 0)) {
    try {
      const dbReturn = await env.DB.prepare(
        "SELECT * FROM ItemReturn WHERE id = ? OR returnNumber = ?"
      ).bind(id, id).first<any>();
      if (dbReturn) {
        const linesQuery = await env.DB.prepare(`
          SELECT l.*, i.code AS itemCode, i.description AS itemDescription
          FROM ItemReturnLine l
          LEFT JOIN Item i ON l.itemId = i.id OR l.itemId = i.code
          WHERE l.returnId = ?
        `).bind(dbReturn.id).all<any>();

        const fetched = {
          ...dbReturn,
          lines: linesQuery.results || []
        };

        const existingIdx = fallbackState.returns.findIndex(r => r.id === dbReturn.id);
        if (existingIdx >= 0) {
          fallbackState.returns[existingIdx] = fetched;
        } else {
          fallbackState.returns.unshift(fetched);
        }
        ret = fetched;
      }
    } catch (err) {
      console.warn("[getOrFetchReturn Error]", err);
    }
  }
  return ret || null;
}

async function getOrFetchAdjustment(id: string, env: Env): Promise<any> {
  let adj = fallbackState.adjustments.find(a => a.id === id || a.adjustmentNumber === id);
  if (env.DB && !adj) {
    try {
      const dbAdj = await env.DB.prepare(`
        SELECT a.*, i.code AS itemCode, i.description AS itemDescription
        FROM StockAdjustment a
        LEFT JOIN Item i ON a.itemId = i.id OR a.itemId = i.code
        WHERE a.id = ? OR a.adjustmentNumber = ?
      `).bind(id, id).first<any>();
      if (dbAdj) {
        const fetched = {
          ...dbAdj,
          status: dbAdj.approvedById ? "APPROVED" : "PENDING_APPROVAL",
          quantity: Math.abs(Number(dbAdj.quantityDelta || 0))
        };
        fallbackState.adjustments.unshift(fetched);
        adj = fetched;
      }
    } catch (err) {
      console.warn("[getOrFetchAdjustment Error]", err);
    }
  }
  return adj || null;
}

async function getOrFetchDisposal(id: string, env: Env): Promise<any> {
  let disp = fallbackState.disposals.find(d => d.id === id || d.disposalNumber === id);
  if (env.DB && !disp) {
    try {
      const dbDisp = await env.DB.prepare(`
        SELECT d.*, i.code AS itemCode, i.description AS itemDescription
        FROM StockDisposal d
        LEFT JOIN Item i ON d.itemId = i.id OR d.itemId = i.code
        WHERE d.id = ? OR d.disposalNumber = ?
      `).bind(id, id).first<any>();
      if (dbDisp) {
        fallbackState.disposals.unshift(dbDisp);
        disp = dbDisp;
      }
    } catch (err) {
      console.warn("[getOrFetchDisposal Error]", err);
    }
  }
  return disp || null;
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
  const user = await parseAuthUser(request, jwtSecret);

  try {
    // [Bugfix]: Monkey-patch D1 bind to automatically convert undefined to null
    // This prevents "Type 'undefined' not supported" crashes that cause silent D1 insert failures
    if (env.DB && !(env.DB as any)._patched) {
      const originalPrepare = env.DB.prepare.bind(env.DB);
      env.DB.prepare = (query) => {
        const stmt = originalPrepare(query);
        const originalBind = stmt.bind.bind(stmt);
        stmt.bind = (...args) => originalBind(...args.map((a) => a === undefined ? null : a));
        return stmt;
      };
      (env.DB as any)._patched = true;
    }
    // If D1 database is connected, synchronize master item catalog into memory cache for instant lookups
    if (env.DB) {
      try {
        const dbItems = await env.DB.prepare("SELECT * FROM Item WHERE active = 1").all<any>();
        if (dbItems.results && dbItems.results.length > 0) {
          for (const item of dbItems.results) {
            const idx = fallbackState.items.findIndex(i => i.id === item.id || (i.code && i.code === item.code));
            if (idx >= 0) {
              fallbackState.items[idx] = { ...fallbackState.items[idx], ...item };
            } else {
              fallbackState.items.push(item);
            }
          }
        }
      } catch (e) { console.error("[D1 Error]", e); }
    }

    // 1. Health Check
    if (path === "/health" && method === "GET") {
      let dbOk = false;
      if (env.DB) {
        try {
          await env.DB.prepare("SELECT 1").first();
          dbOk = true;
        } catch (e) { console.error("[D1 Error]", e); }
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
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
      const email = body.email?.trim()?.toLowerCase();
      const password = body.password;

      // Check D1 or Fallback State
      let foundUser: any = null;
      if (env.DB) {
        try {
          const res = await env.DB.prepare("SELECT * FROM User WHERE lower(email) = ?").bind(email).first<any>();
          if (res) foundUser = res;
        } catch (e) { console.error("[D1 Error]", e); }
      }

      if (!foundUser) {
        foundUser = fallbackState.users.find(u => u.email.toLowerCase() === email);
      }

      if (!foundUser) {
        return jsonResponse({ message: "Invalid email or password." }, 401);
      }

      // Password verification (Accepts standard seed passwords or stored user password)
      const validPw = ((env.ENVIRONMENT !== "production" && password === "Password123!") || ((foundUser.password || foundUser.passwordHash) && password === (foundUser.password || foundUser.passwordHash)));
      if (!validPw) {
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
    // Matches: /admin/master-data/:model, /master-data/:model and /admin/master-data/:model/:id
    if (path.startsWith("/admin/master-data/") || (path.startsWith("/master-data/") && path !== "/master-data")) {
      const parts = path.split("/").filter(Boolean);
      const model = parts[0] === "admin" ? parts[2] : parts[1];
      const targetId = parts[0] === "admin" ? parts[3] : parts[2];
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
        let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
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
        let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
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
        let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
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
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
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
      const id = getPathSegment(path, 2);
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
      const userItem = fallbackState.users.find(u => u.id === id);
      if (!userItem) return jsonResponse({ message: "User not found" }, 404);
      userItem.active = body.active ? 1 : 0;
      const { password, ...resUser } = userItem;
      return jsonResponse(resUser);
    }

    if (path.startsWith("/admin/users/") && method === "PATCH") {
      const id = getPathSegment(path, 2);
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
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
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
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
            } catch (d1Err) { console.error("[D1 Error]", d1Err); }
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
    console.error("[Unhandled API Error]", err);
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
      const id = getPathSegment(path, 1);
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
      const item = fallbackState.items.find(i => i.id === id);
      if (!item) return jsonResponse({ message: "Item not found" }, 404);
      Object.assign(item, body);
      return jsonResponse(enrichItem(item));
    }

    if (path.startsWith("/items/") && path.endsWith("/deactivate") && method === "PATCH") {
      const id = getPathSegment(path, 1);
      if (env.DB) {
        try {
          await env.DB.prepare(`UPDATE Item SET active = 0, updatedAt = datetime('now') WHERE id = ?`).bind(id).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }
      const item = fallbackState.items.find(i => i.id === id);
      if (!item) return jsonResponse({ message: "Item not found" }, 404);
      item.active = false;
      return jsonResponse(enrichItem(item));
    }

    if (path.startsWith("/items/") && path.endsWith("/custody") && method === "GET") {
      const id = getPathSegment(path, 1);
      const records = fallbackState.assetCustody.filter(c => c.itemId === id);
      return jsonResponse(records);
    }

    if (path.startsWith("/items/") && path.endsWith("/custody") && method === "POST") {
      const id = getPathSegment(path, 1);
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
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
      const id = getPathSegment(path, 1);
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
      const custody = fallbackState.assetCustody.find(c => c.id === id);
      if (!custody) return jsonResponse({ message: "Custody record not found" }, 404);
      custody.status = "RETURNED";
      custody.returnedAt = body.returnedAt || new Date().toISOString();
      custody.condition = body.condition || custody.condition;
      custody.notes = body.notes || custody.notes;
      return jsonResponse(custody);
    }

    if (path.startsWith("/asset-custody/") && method === "PATCH") {
      const id = getPathSegment(path, 1);
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
      const custody = fallbackState.assetCustody.find(c => c.id === id);
      if (!custody) return jsonResponse({ message: "Custody record not found" }, 404);
      Object.assign(custody, body);
      return jsonResponse(custody);
    }

    if ((path === "/items/export" || path === "/items/export.xlsx") && method === "GET") {
      const headers = ["Item Code", "Description", "Category", "Unit", "Reorder Level", "Status"];
      const csvRows = [headers.join(",")];
      for (const i of fallbackState.items) {
        const cat = fallbackState.categories.find(c => c.id === i.categoryId)?.name || "General";
        const unit = fallbackState.unitsOfMeasure.find(u => u.id === i.unitId)?.name || "Unit";
        csvRows.push([
          `"${i.code}"`,
          `"${(i.description || "").replace(/"/g, '""')}"`,
          `"${cat}"`,
          `"${unit}"`,
          i.reorderLevel || 0,
          `"${i.active !== false ? "ACTIVE" : "INACTIVE"}"`
        ].join(","));
      }
      return new Response(csvRows.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="inventory-items-export.xlsx"',
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    if (path.startsWith("/items/") && method === "GET") {
      const id = getPathSegment(path, 1);
      const unslugged = id.startsWith("item-") ? id.slice(5) : id;
      let rawItem: any = null;
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
          if (dbItem) rawItem = dbItem;
        } catch (e) { console.error("[D1 Error]", e); }
      }
      if (!rawItem) rawItem = findItem(id);
      if (!rawItem) return jsonResponse({ message: "Item not found" }, 404);

      const enriched = enrichItem(rawItem);

      // Build bin card movements
      let movements: any[] = [];
      if (env.DB) {
        try {
          const mRes = await env.DB.prepare(`
            SELECT * FROM StockLedgerEntry 
            WHERE itemId = ? OR itemId = ?
            ORDER BY createdAt ASC
          `).bind(rawItem.id, rawItem.code || rawItem.id).all<any>();
          if (mRes.results && mRes.results.length > 0) movements = mRes.results;
        } catch (e) { console.error("[D1 Error]", e); }
      }
      if (movements.length === 0) {
        movements = fallbackState.ledger.filter(l => l.itemId === rawItem.id || (rawItem.code && l.itemId === rawItem.code));
      }

      let balance = 0;
      const binCardRows = [
        {
          id: `${rawItem.id}-registration`,
          date: rawItem.createdAt || new Date().toISOString(),
          reference: "Item registration",
          transactionType: "REGISTRATION",
          itemDescription: enriched.description,
          source: "System",
          destination: enriched.defaultLocation?.name ?? "Main Store",
          provider: "N/A",
          department: "N/A",
          batchNumber: "N/A",
          expiryDate: null,
          unitCost: null,
          totalPrice: 0,
          receivedQuantity: 0,
          issuedQuantity: 0,
          balance: 0,
          remarks: "Item opened in the inventory register."
        }
      ];

      for (const m of movements) {
        const qtyIn = Number(m.quantityIn || (m.entryType === "RECEIPT" || m.quantity > 0 ? Math.abs(Number(m.quantity || 0)) : 0));
        const qtyOut = Number(m.quantityOut || (m.entryType === "ISSUE" || m.quantity < 0 ? Math.abs(Number(m.quantity || 0)) : 0));
        const net = qtyIn > 0 ? qtyIn : -qtyOut;
        balance += net;
        const unitCost = m.unitCost ? Number(m.unitCost) : null;
        binCardRows.push({
          id: m.id,
          date: m.postedAt || m.createdAt,
          reference: m.referenceId || m.sourceId || m.entryNumber || "TXN",
          transactionType: m.entryType || m.type || "STOCK_MOVEMENT",
          itemDescription: enriched.description,
          source: qtyIn > 0 ? "Received stock" : "Store",
          destination: qtyOut > 0 ? "Issuing department" : "Store",
          provider: "N/A",
          department: "N/A",
          batchNumber: m.batchNumber || "N/A",
          expiryDate: m.expiryDate || null,
          unitCost,
          totalPrice: unitCost ? Math.abs(net) * unitCost : null,
          receivedQuantity: qtyIn,
          issuedQuantity: qtyOut,
          balance,
          remarks: m.notes || ""
        });
      }

      return jsonResponse({
        ...enriched,
        binCard: binCardRows
      });
    }

    if (path.startsWith("/items/") && (method === "PATCH" || method === "PUT")) {
      const id = getPathSegment(path, 1);
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
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
        } catch (e) { console.error("[D1 Error]", e); }
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
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
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
      const id = getPathSegment(path, 1);
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
      const loc = fallbackState.storageLocations.find(l => l.id === id);
      if (!loc) return jsonResponse({ message: "Storage location not found" }, 404);
      loc.isActive = body.active ? 1 : 0;
      return jsonResponse(loc);
    }

    if (path.startsWith("/storage-locations/") && method === "PATCH") {
      const id = getPathSegment(path, 1);
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
      const loc = fallbackState.storageLocations.find(l => l.id === id);
      if (!loc) return jsonResponse({ message: "Storage location not found" }, 404);
      Object.assign(loc, body);
      return jsonResponse(loc);
    }

    if (path === "/stock-batches" && method === "GET") {
      if (env.DB) {
        try {
          const res = await env.DB.prepare("SELECT * FROM StockBatch ORDER BY createdAt DESC").all<any>();
          if (res.results && res.results.length > 0) {
            return jsonResponse(res.results.map(enrichBatch));
          }
        } catch (e) { console.error("[D1 Error]", e); }
      }
      return jsonResponse(fallbackState.batches.map(enrichBatch));
    }

    if (path.startsWith("/stock-batches/") && path.endsWith("/allocate") && method === "POST") {
      const id = getPathSegment(path, 1);
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
      let batch = fallbackState.batches.find(b => b.id === id);
      if (env.DB && !batch) {
        try {
          const dbBatch = await env.DB.prepare("SELECT * FROM StockBatch WHERE id = ?").bind(id).first<any>();
          if (dbBatch) batch = dbBatch;
        } catch (e) { console.error("[D1 Error]", e); }
      }
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
      const led = {
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
      };
      fallbackState.ledger.unshift(led);

      if (env.DB) {
        try {
          await env.DB.prepare("UPDATE StockBatch SET remainingQuantity = ?, status = ?, updatedAt = datetime('now') WHERE id = ?")
            .bind(batch.remainingQuantity, batch.status, id).run();

          await env.DB.prepare(
            `INSERT INTO StockLocationBalance (id, itemId, batchId, storeId, storageLocationId, quantityOnHand, quantityReserved, quantityAvailable, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))
             ON CONFLICT(id) DO UPDATE SET quantityOnHand = quantityOnHand + ?, quantityAvailable = quantityAvailable + ?, updatedAt = datetime('now')`
          ).bind(bal.id, bal.itemId, bal.batchId, bal.storeId, bal.storageLocationId, allocQty, allocQty, allocQty, allocQty).run().catch(async () => {
            await env.DB.prepare("UPDATE StockLocationBalance SET quantityOnHand = quantityOnHand + ?, quantityAvailable = quantityAvailable + ?, updatedAt = datetime('now') WHERE batchId = ? AND storageLocationId = ?")
              .bind(allocQty, allocQty, id, body.storageLocationId).run();
          });

          await env.DB.prepare(
            `INSERT INTO StockLedgerEntry (id, itemId, batchId, storeId, storageLocationId, entryType, quantityIn, quantityOut, balanceAfter, unitPrice, referenceType, referenceId, createdAt)
             VALUES (?, ?, ?, ?, ?, 'RECEIPT', ?, 0, ?, ?, 'ALLOCATION', ?, datetime('now'))`
          ).bind(led.id, batch.itemId, id, bal.storeId, bal.storageLocationId, allocQty, led.balanceAfter, batch.unitCost || 0, batch.batchNumber || id).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse({ success: true, allocated: true, remainingQuantity: batch.remainingQuantity, balance: enrichBalance(bal) });
    }

    if (path === "/location-balances" && method === "GET") {
      const barcode = url.searchParams.get("barcode");
      if (env.DB) {
        try {
          const res = await env.DB.prepare("SELECT * FROM StockLocationBalance").all<any>();
          if (res.results && res.results.length > 0) {
            let list = res.results;
            if (barcode) {
              const q = barcode.toLowerCase();
              list = list.filter((b: any) => 
                (b.batchId && b.batchId.toLowerCase().includes(q)) ||
                (b.storageLocationId && b.storageLocationId.toLowerCase().includes(q)) ||
                (b.itemId && b.itemId.toLowerCase().includes(q))
              );
            }
            return jsonResponse(list.map(enrichBalance));
          }
        } catch (e) { console.error("[D1 Error]", e); }
      }
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
      if (env.DB) {
        try {
          let query = "SELECT * FROM StockLocationBalance WHERE 1=1";
          const params: any[] = [];
          if (itemId) { query += " AND itemId = ?"; params.push(itemId); }
          if (locId) { query += " AND storageLocationId = ?"; params.push(locId); }
          const res = await env.DB.prepare(query).bind(...params).all<any>();
          if (res.results && res.results.length > 0) {
            return jsonResponse(res.results.map(enrichBalance));
          }
        } catch (e) { console.error("[D1 Error]", e); }
      }
      let list = fallbackState.balances;
      if (itemId) list = list.filter(b => b.itemId === itemId);
      if (locId) list = list.filter(b => b.storageLocationId === locId);
      return jsonResponse(list.map(enrichBalance));
    }

    if (path === "/ledger/movements" && method === "GET") {
      const itemId = url.searchParams.get("itemId");
      if (env.DB) {
        try {
          let query = `
            SELECT m.*, i.code AS itemCode, i.description AS itemDescription
            FROM StockLedgerEntry m
            LEFT JOIN Item i ON m.itemId = i.id OR m.itemId = i.code
          `;
          const params: any[] = [];
          if (itemId) { query += " WHERE m.itemId = ? OR m.itemId = ?"; params.push(itemId, itemId.replace(/^item-/, "")); }
          query += " ORDER BY m.createdAt DESC";
          const res = await env.DB.prepare(query).bind(...params).all<any>();
          if (res.results && res.results.length > 0) {
            return jsonResponse(res.results.map(enrichLedgerEntry));
          }
        } catch (e) { console.error("[D1 Error]", e); }
      }
      let list = fallbackState.ledger;
      if (itemId) list = list.filter(l => l.itemId === itemId || l.itemId === itemId.replace(/^item-/, ""));
      return jsonResponse(list.map(enrichLedgerEntry));
    }

    // 9. Receipts (Model 19 / GRN)
    if (path === "/receipts" && method === "GET") {
      const search = (url.searchParams.get("search") || "").toLowerCase().trim();
      if (env.DB) {
        try {
          const notes = await env.DB.prepare("SELECT * FROM GoodsReceivingNote ORDER BY createdAt DESC").all<any>();
          if (notes.results && notes.results.length > 0) {
            const lines = await env.DB.prepare(`
              SELECT l.*, i.code AS itemCode, i.description AS itemDescription, i.unitId, i.categoryId, i.modelNumber, i.serialNumber
              FROM GoodsReceivingLine l
              LEFT JOIN Item i ON l.itemId = i.id OR l.itemId = i.code
            `).all<any>();
            let list = notes.results.map((n: any) => ({
              ...n,
              lines: (lines.results || []).filter((l: any) => l.grnId === n.id)
            }));
            if (search) {
              list = list.filter((r: any) => 
                (r.grnNumber && r.grnNumber.toLowerCase().includes(search)) ||
                (r.purchaseOrderRef && r.purchaseOrderRef.toLowerCase().includes(search)) ||
                (r.supplierDonorId && r.supplierDonorId.toLowerCase().includes(search))
              );
            }
            return jsonResponse(list.map(enrichReceipt));
          }
        } catch (e) { console.error("[D1 Error]", e); }
      }
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
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
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
          const resolvedItem = findItem(l.itemId);
          const actualItemId = resolvedItem ? resolvedItem.id : (l.itemId || "");
          return {
            id: uid("line"),
            grnId: receiptId,
            itemId: actualItemId,
            itemDescription: resolvedItem?.description,
            itemCode: resolvedItem?.code,
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

      if (env.DB) {
        try {
          await env.DB.prepare(
            `INSERT INTO GoodsReceivingNote (id, grnNumber, sourceType, purchaseOrderRef, donationLetterRef, governmentAllocationRef, projectSupportRef, deliveryNoteRef, supplierDonorId, receivedAt, createdById, status, remarks, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
          ).bind(
            newReceipt.id, newReceipt.grnNumber, newReceipt.sourceType, newReceipt.purchaseOrderRef,
            newReceipt.donationLetterRef, newReceipt.governmentAllocationRef, newReceipt.projectSupportRef,
            newReceipt.deliveryNoteRef, newReceipt.supplierDonorId, newReceipt.receivedAt, newReceipt.createdById,
            newReceipt.status, newReceipt.remarks
          ).run();

          for (const l of newReceipt.lines) {
            await env.DB.prepare(
              `INSERT INTO GoodsReceivingLine (id, grnId, itemId, quantityReceived, unitPrice, batchNumber, expiryDate, fundingSourceId, remarks)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              l.id, l.grnId, l.itemId, l.quantityReceived, l.unitPrice, l.batchNumber || null, l.expiryDate || null, l.fundingSourceId || null, l.remarks || null
            ).run();
          }
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichReceipt(newReceipt), 201);
    }

    if (path.startsWith("/receipts/") && path.endsWith("/submit") && method === "POST") {
      const id = getPathSegment(path, 1);
      const receipt = await getOrFetchReceipt(id, env);
      if (!receipt) return jsonResponse({ message: "Receipt not found" }, 404);
      receipt.status = "PENDING_INSPECTION";
      if (env.DB) {
        try {
          await env.DB.prepare("UPDATE GoodsReceivingNote SET status = 'PENDING_INSPECTION', updatedAt = datetime('now') WHERE id = ?").bind(receipt.id).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }
      return jsonResponse(enrichReceipt(receipt));
    }

    if (path.startsWith("/receipts/lines/") && path.endsWith("/inspect") && method === "POST") {
      const lineId = getPathSegment(path, 2);
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
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
      if (!foundLine && env.DB) {
        try {
          const dbLine = await env.DB.prepare(`
            SELECT l.*, i.code AS itemCode, i.description AS itemDescription
            FROM GoodsReceivingLine l
            LEFT JOIN Item i ON l.itemId = i.id OR l.itemId = i.code
            WHERE l.id = ?
          `).bind(lineId).first<any>();
          if (dbLine) {
            foundReceipt = await getOrFetchReceipt(dbLine.grnId, env);
            foundLine = (foundReceipt?.lines || []).find((line: any) => line.id === lineId) || dbLine;
          }
        } catch (e) { console.error("[D1 Error]", e); }
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

      if (env.DB) {
        try {
          await env.DB.prepare(
            `INSERT OR REPLACE INTO Inspection (id, grnLineId, quantityVerified, quantityAccepted, quantityRejected, qualityStatus, outcome, notes, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
          ).bind(foundLine.inspection.id, lineId, foundLine.quantityVerified, accepted, rejected, qualityStatus, outcome, foundLine.qualityNotes).run();

          // Removed invalid UPDATE to GoodsReceivingLine
        } catch (e) { console.error("[D1 Error]", e); }
      }

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

        if (env.DB) {
          try {
            await env.DB.prepare(
              `INSERT OR REPLACE INTO StockBatch (id, itemId, grnLineId, batchNumber, expiryDate, unitCost, totalAcceptedQuantity, remainingQuantity, status, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_STORAGE', datetime('now'), datetime('now'))`
            ).bind(batch.id, batch.itemId, batch.grnLineId, batch.batchNumber, batch.expiryDate || "", batch.unitCost, accepted, accepted).run();
          } catch (e) { console.error("[D1 Error]", e); }
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

        if (env.DB) {
          try {
            await env.DB.prepare("UPDATE GoodsReceivingNote SET status = ?, updatedAt = datetime('now') WHERE id = ?")
              .bind(foundReceipt.status, foundReceipt.id).run();
          } catch (e) { console.error("[D1 Error]", e); }
        }
      }

      return jsonResponse(enrichReceipt(foundReceipt));
    }

    if (path.startsWith("/receipts/") && method === "GET") {
      const id = getPathSegment(path, 1);
      const receipt = await getOrFetchReceipt(id, env);
      if (!receipt) return jsonResponse({ message: "Receipt not found" }, 404);
      return jsonResponse(enrichReceipt(receipt));
    }

    // 10. Issues (Model 22 / SIV)
    if (path === "/issues" && method === "GET") {
      if (env.DB) {
        try {
          const vouchers = await env.DB.prepare("SELECT * FROM StockIssueVoucher ORDER BY createdAt DESC").all<any>();
          if (vouchers.results && vouchers.results.length > 0) {
            const lines = await env.DB.prepare("SELECT * FROM StockIssueLine").all<any>();
            const list = vouchers.results.map((v: any) => ({
              ...v,
              requestNumber: v.sivNumber,
              lines: (lines.results || []).filter((l: any) => l.issueId === v.id).map((l: any) => ({
                ...l,
                quantity: Number(l.quantityRequested || l.quantity || 0)
              }))
            }));
            return jsonResponse(list.map(enrichIssue));
          }
        } catch (e) { console.error("[D1 Error]", e); }
      }
      return jsonResponse(fallbackState.issues.map(enrichIssue));
    }

    if (path === "/issues" && method === "POST") {
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
      const issueId = uid("siv");
      const sivNumber = `SIV-${Date.now().toString().slice(-6)}`;
      const newIssue = {
        id: issueId,
        sivNumber,
        requestNumber: sivNumber,
        departmentId: body.departmentId,
        recipientName: body.recipientName,
        purpose: body.purpose,
        status: "PENDING_APPROVAL",
        createdById: user?.id || "usr-admin",
        createdAt: new Date().toISOString(),
        lines: (body.lines || []).map((l: any) => ({
          id: uid("isline"),
          issueId,
          itemId: l.itemId,
          quantity: Number(l.quantity ?? l.quantityRequested ?? 1),
          quantityRequested: Number(l.quantityRequested ?? l.quantity ?? 1),
          quantityApproved: 0,
          quantityIssued: 0,
          unitPrice: 0
        }))
      };

      fallbackState.issues.unshift(newIssue);

      if (env.DB) {
        try {
          await env.DB.prepare(
            `INSERT INTO StockIssueVoucher (id, sivNumber, departmentId, recipientName, purpose, createdById, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', datetime('now'), datetime('now'))`
          ).bind(newIssue.id, newIssue.sivNumber, newIssue.departmentId, newIssue.recipientName, newIssue.purpose, newIssue.createdById).run();

          for (const l of newIssue.lines) {
            await env.DB.prepare(
              `INSERT INTO StockIssueLine (id, issueId, itemId, quantityRequested, quantityApproved, quantityIssued, unitPrice)
               VALUES (?, ?, ?, ?, 0, 0, ?)`
            ).bind(l.id, l.issueId, l.itemId, l.quantityRequested, l.unitPrice || 0).run();
          }
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichIssue(newIssue), 201);
    }

    if (path.startsWith("/issues/") && path.endsWith("/pick-list") && method === "GET") {
      const id = getPathSegment(path, 1);
      const rawIssue = await getOrFetchIssue(id, env);
      const issue = rawIssue ? enrichIssue(rawIssue) : null;
      
      const picks: any[] = [];
      for (const line of (issue?.lines || [])) {
         let allocations: any[] = [];
         if (env.DB) {
            try {
               const balances = await env.DB.prepare(`
                 SELECT b.*, s.name as storeName, bt.batchNumber as batchNumber
                 FROM StockLocationBalance b 
                 LEFT JOIN StoreLocation s ON b.storeId = s.id 
                 LEFT JOIN StockBatch bt ON b.batchId = bt.id
                 WHERE b.itemId = ? AND b.quantityOnHand > 0
               `).bind(line.itemId).all<any>();
               allocations = (balances.results || []).map((b: any) => ({
                  batchNumber: b.batchNumber || b.batchId || "N/A",
                  storeName: b.storeName || "Main Store",
                  shelfCode: b.storageLocationId || "-",
                  binCode: "-",
                  availableQuantity: b.quantityOnHand,
                  quantityToIssue: Math.min(b.quantityOnHand, line.quantityRequested || line.quantity)
               }));
            } catch (e) { console.error("[D1 Error]", e); }
         } else {
            allocations = fallbackState.balances.filter(b => b.itemId === line.itemId && Number(b.quantityOnHand) > 0).map(b => ({
               batchNumber: b.batchId || "N/A",
               storeName: "Main Store",
               shelfCode: b.storageLocationId || "-",
               binCode: "-",
               availableQuantity: b.quantityOnHand,
               quantityToIssue: Math.min(Number(b.quantityOnHand), line.quantityRequested || line.quantity)
            }));
         }
         picks.push({
            item: line.item,
            quantityRequested: line.quantityRequested || line.quantity,
            allocations
         });
      }

      return jsonResponse({
        issue,
        picks,
        lines: issue?.lines || []
      });
    }

    if (path.startsWith("/issues/") && path.endsWith("/approve") && method === "POST") {
      const id = getPathSegment(path, 1);
      const issue = await getOrFetchIssue(id, env);
      if (!issue) return jsonResponse({ message: "Issue request not found" }, 404);
      issue.status = "APPROVED";
      (issue.lines || []).forEach((l: any) => {
        l.quantityApproved = Number(l.quantityRequested ?? l.quantity ?? 0);
      });

      if (env.DB) {
        try {
          await env.DB.prepare("UPDATE StockIssueVoucher SET status = 'APPROVED', approvedById = ?, updatedAt = datetime('now') WHERE id = ?")
            .bind(user?.id || "usr-admin", issue.id).run();
          await env.DB.prepare("UPDATE StockIssueLine SET quantityApproved = quantityRequested WHERE issueId = ?")
            .bind(issue.id).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichIssue(issue));
    }

    if (path.startsWith("/issues/") && path.endsWith("/reject") && method === "POST") {
      const id = getPathSegment(path, 1);
      const issue = await getOrFetchIssue(id, env);
      if (!issue) return jsonResponse({ message: "Issue request not found" }, 404);
      issue.status = "REJECTED";

      if (env.DB) {
        try {
          await env.DB.prepare("UPDATE StockIssueVoucher SET status = 'REJECTED', approvedById = ?, updatedAt = datetime('now') WHERE id = ?")
            .bind(user?.id || "usr-admin", issue.id).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichIssue(issue));
    }

    if (path.startsWith("/issues/") && path.endsWith("/issue") && method === "POST") {
      const id = getPathSegment(path, 1);
      const issue = await getOrFetchIssue(id, env);
      if (!issue) return jsonResponse({ message: "Issue request not found" }, 404);
      issue.status = "ISSUED";
      for (const line of issue.lines || []) {
        line.quantityIssued = Number(line.quantityApproved ?? line.quantityRequested ?? line.quantity ?? 0);
        const issuedQty = line.quantityIssued || line.quantityRequested || 1;

        let currentBalance = 0;
        if (env.DB) {
           try {
              const res = await env.DB.prepare("SELECT SUM(quantityOnHand) as total FROM StockLocationBalance WHERE itemId = ?").bind(line.itemId).first<any>();
              currentBalance = Number(res?.total || 0);
           } catch (e) { console.error("[D1 Error]", e); }
        }
        if (!env.DB || currentBalance === 0) {
           currentBalance = fallbackState.balances
             .filter(b => b.itemId === line.itemId)
             .reduce((sum, b) => sum + Number(b.quantityOnHand || 0), 0);
        }

        const balanceAfter = Math.max(0, currentBalance - issuedQty);
        
        const led = {
          id: uid("led"),
          itemId: line.itemId,
          entryType: "ISSUE",
          quantityIn: 0,
          quantityOut: issuedQty,
          balanceAfter: balanceAfter,
          referenceType: "SIV",
          referenceId: issue.sivNumber,
          createdAt: new Date().toISOString()
        };
        fallbackState.ledger.unshift(led);

        // Deduct from fallback state balances
        let remainingDeduct = issuedQty;
        for (const fb of fallbackState.balances) {
           if (fb.itemId === line.itemId && Number(fb.quantityOnHand) > 0) {
              if (remainingDeduct <= 0) break;
              const deduct = Math.min(remainingDeduct, Number(fb.quantityOnHand));
              fb.quantityOnHand = Number(fb.quantityOnHand) - deduct;
              remainingDeduct -= deduct;
           }
        }

        if (env.DB) {
          try {
            await env.DB.prepare(
              `INSERT INTO StockLedgerEntry (id, itemId, entryType, quantityIn, quantityOut, balanceAfter, referenceType, referenceId, createdAt)
               VALUES (?, ?, 'ISSUE', 0, ?, ?, 'SIV', ?, datetime('now'))`
            ).bind(led.id, line.itemId, led.quantityOut, balanceAfter, issue.sivNumber).run();

            // Deduct from StockLocationBalance
            let remLoc = issuedQty;
            const balances = await env.DB.prepare("SELECT id, quantityOnHand FROM StockLocationBalance WHERE itemId = ? AND quantityOnHand > 0 ORDER BY createdAt ASC").bind(line.itemId).all<any>();
            for (const b of (balances.results || [])) {
               if (remLoc <= 0) break;
               const deduct = Math.min(remLoc, Number(b.quantityOnHand));
               await env.DB.prepare("UPDATE StockLocationBalance SET quantityOnHand = quantityOnHand - ?, updatedAt = datetime('now') WHERE id = ?").bind(deduct, b.id).run();
               remLoc -= deduct;
            }

            // Deduct from StockBatch
            let remBatch = issuedQty;
            const batches = await env.DB.prepare("SELECT id, remainingQuantity FROM StockBatch WHERE itemId = ? AND remainingQuantity > 0 ORDER BY expiryDate ASC, createdAt ASC").bind(line.itemId).all<any>();
            for (const bt of (batches.results || [])) {
               if (remBatch <= 0) break;
               const deduct = Math.min(remBatch, Number(bt.remainingQuantity));
               await env.DB.prepare("UPDATE StockBatch SET remainingQuantity = remainingQuantity - ?, updatedAt = datetime('now') WHERE id = ?").bind(deduct, bt.id).run();
               remBatch -= deduct;
            }

          } catch (e) { console.error("[D1 Error]", e); }
        }
      }

      if (env.DB) {
        try {
          await env.DB.prepare("UPDATE StockIssueVoucher SET status = 'ISSUED', issuedById = ?, updatedAt = datetime('now') WHERE id = ?")
            .bind(user?.id || "usr-admin", issue.id).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      issue.issuedById = user?.id || "usr-admin";
      issue.updatedAt = new Date().toISOString();

      return jsonResponse(enrichIssue(issue));
    }

    if (path.startsWith("/issues/") && path.endsWith("/receive") && method === "POST") {
      const id = getPathSegment(path, 1);
      const issue = await getOrFetchIssue(id, env);
      if (!issue) return jsonResponse({ message: "Issue request not found" }, 404);
      issue.status = "COMPLETED";

      if (env.DB) {
        try {
          await env.DB.prepare("UPDATE StockIssueVoucher SET status = 'COMPLETED', updatedAt = datetime('now') WHERE id = ?")
            .bind(issue.id).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichIssue(issue));
    }

    // 11. Returns
    if (path === "/returns" && method === "GET") {
      if (env.DB) {
        try {
          const rets = await env.DB.prepare("SELECT * FROM ItemReturn ORDER BY createdAt DESC").all<any>();
          if (rets.results && rets.results.length > 0) {
            const lines = await env.DB.prepare("SELECT * FROM ItemReturnLine").all<any>();
            const list = rets.results.map((r: any) => ({
              ...r,
              lines: (lines.results || []).filter((l: any) => l.returnId === r.id)
            }));
            return jsonResponse(list.map(enrichReturn));
          }
        } catch (e) { console.error("[D1 Error]", e); }
      }
      return jsonResponse(fallbackState.returns.map(enrichReturn));
    }

    if (path === "/returns" && method === "POST") {
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
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

      if (env.DB) {
        try {
          await env.DB.prepare(
            `INSERT INTO ItemReturn (id, returnNumber, departmentId, returnedById, reason, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, 'PENDING_INSPECTION', datetime('now'), datetime('now'))`
          ).bind(ret.id, ret.returnNumber, ret.departmentId, user?.id || "usr-admin", ret.reason).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichReturn(ret), 201);
    }

    if (path.startsWith("/returns/") && path.endsWith("/inspect") && method === "POST") {
      const id = getPathSegment(path, 1);
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
      const ret = await getOrFetchReturn(id, env);
      if (!ret) return jsonResponse({ message: "Return not found" }, 404);
      ret.status = body.outcome === "APPROVED" ? "ACCEPTED" : (body.outcome === "REJECTED" ? "REJECTED" : "PARTIALLY_ACCEPTED");

      if (env.DB) {
        try {
          await env.DB.prepare("UPDATE ItemReturn SET status = ?, updatedAt = datetime('now') WHERE id = ?")
            .bind(ret.status, ret.id).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichReturn(ret));
    }

    if (path.startsWith("/returns/") && method === "GET") {
      const id = getPathSegment(path, 1);
      const ret = await getOrFetchReturn(id, env);
      if (!ret) return jsonResponse({ message: "Return not found" }, 404);
      return jsonResponse(enrichReturn(ret));
    }

    // 12. Approvals & Inspections Queue
    if (path === "/approver/queue" && method === "GET") {
      if (env.DB) {
        try {
          const [issuesRes, linesRes, adjRes, dispRes] = await Promise.all([
            env.DB.prepare("SELECT * FROM StockIssueVoucher WHERE status = 'PENDING_APPROVAL'").all<any>(),
            env.DB.prepare("SELECT * FROM StockIssueLine").all<any>(),
            env.DB.prepare("SELECT * FROM StockAdjustment WHERE approvedById IS NULL OR approvedById = ''").all<any>(),
            env.DB.prepare("SELECT * FROM StockDisposal WHERE status = 'PENDING_APPROVAL'").all<any>()
          ]);

          const pendingIssues = (issuesRes.results || []).map((v: any) => ({
            ...v,
            requestNumber: v.sivNumber,
            lines: (linesRes.results || []).filter((l: any) => l.issueId === v.id).map((l: any) => ({
              ...l,
              quantity: Number(l.quantityRequested || l.quantity || 0)
            }))
          })).map(enrichIssue);

          const pendingAdjustments = (adjRes.results || []).map((a: any) => ({
            ...a,
            status: "PENDING_APPROVAL",
            quantity: Math.abs(Number(a.quantityDelta || 0))
          })).map(enrichAdjustment);

          const pendingDisposals = (dispRes.results || []).map(enrichDisposal);

          return jsonResponse({
            pendingIssues: pendingIssues.length > 0 ? pendingIssues : fallbackState.issues.filter(i => i.status === "PENDING_APPROVAL").map(enrichIssue),
            pendingAdjustments: pendingAdjustments.length > 0 ? pendingAdjustments : fallbackState.adjustments.filter(a => a.status === "PENDING_APPROVAL").map(enrichAdjustment),
            pendingDisposals: pendingDisposals.length > 0 ? pendingDisposals : fallbackState.disposals.filter(d => d.status === "PENDING_APPROVAL").map(enrichDisposal)
          });
        } catch (e) { console.error("[D1 Error]", e); }
      }
      return jsonResponse({
        pendingIssues: fallbackState.issues.filter(i => i.status === "PENDING_APPROVAL").map(enrichIssue),
        pendingAdjustments: fallbackState.adjustments.filter(a => a.status === "PENDING_APPROVAL").map(enrichAdjustment),
        pendingDisposals: fallbackState.disposals.filter(d => d.status === "PENDING_APPROVAL").map(enrichDisposal)
      });
    }

    if (path === "/inspector/queue" && method === "GET") {
      if (env.DB) {
        try {
          const [grns, lines, rets, retLines] = await Promise.all([
            env.DB.prepare("SELECT * FROM GoodsReceivingNote WHERE status = 'PENDING_INSPECTION'").all<any>(),
            env.DB.prepare("SELECT * FROM GoodsReceivingLine").all<any>(),
            env.DB.prepare("SELECT * FROM ItemReturn WHERE status = 'PENDING_INSPECTION'").all<any>(),
            env.DB.prepare("SELECT * FROM ItemReturnLine").all<any>()
          ]);

          const pendingGrns = (grns.results || []).map((g: any) => ({
            ...g,
            lines: (lines.results || []).filter((l: any) => l.grnId === g.id)
          })).map(enrichReceipt);

          const pendingReturns = (rets.results || []).map((r: any) => ({
            ...r,
            lines: (retLines.results || []).filter((l: any) => l.returnId === r.id)
          })).map(enrichReturn);

          return jsonResponse({
            pendingReceipts: pendingGrns.length > 0 ? pendingGrns : (fallbackState.receipts.filter(r => r.status === "PENDING_INSPECTION") || []).map(enrichReceipt),
            pendingGrns: pendingGrns.length > 0 ? pendingGrns : (fallbackState.receipts.filter(r => r.status === "PENDING_INSPECTION") || []).map(enrichReceipt),
            pendingReturns: pendingReturns.length > 0 ? pendingReturns : (fallbackState.returns.filter(r => r.status === "PENDING_INSPECTION") || []).map(enrichReturn),
            recentInspections: []
          });
        } catch (e) { console.error("[D1 Error]", e); }
      }
      const pendingGrns = (fallbackState.receipts.filter(r => r.status === "PENDING_INSPECTION") || []).map(enrichReceipt);
      const pendingReturns = (fallbackState.returns.filter(r => r.status === "PENDING_INSPECTION") || []).map(enrichReturn);
      return jsonResponse({
        pendingReceipts: pendingGrns,
        pendingGrns,
        pendingReturns,
        recentInspections: []
      });
    }

    // 13. Physical Counts & Disposals & Adjustments
    if (path === "/physical-counts" && method === "GET") {
      if (env.DB) {
        try {
          const res = await env.DB.prepare("SELECT * FROM PhysicalCount ORDER BY createdAt DESC").all<any>();
          if (res.results && res.results.length > 0) {
            return jsonResponse(res.results);
          }
        } catch (e) { console.error("[D1 Error]", e); }
      }
      return jsonResponse(fallbackState.counts);
    }

    if (path === "/physical-counts" && method === "POST") {
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
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

      if (env.DB) {
        try {
          await env.DB.prepare(
            `INSERT INTO PhysicalCount (id, countNumber, storeId, status, conductedById, createdAt, updatedAt)
             VALUES (?, ?, ?, 'OPEN', ?, datetime('now'), datetime('now'))`
          ).bind(count.id, count.countNumber, count.locationId || "store-main", count.createdById).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(count, 201);
    }

    if (path.startsWith("/physical-counts/") && path.endsWith("/submit") && method === "POST") {
      const id = getPathSegment(path, 1);
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
      const count = fallbackState.counts.find(c => c.id === id);
      if (!count) return jsonResponse({ message: "Physical count not found" }, 404);
      count.status = "COMPLETED";
      count.submittedAt = new Date().toISOString();
      count.lines = body.lines || count.lines;

      if (env.DB) {
        try {
          await env.DB.prepare("UPDATE PhysicalCount SET status = 'COMPLETED', updatedAt = datetime('now') WHERE id = ?")
            .bind(id).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(count);
    }

    if (path === "/adjustments" && method === "GET") {
      if (env.DB) {
        try {
          const res = await env.DB.prepare("SELECT * FROM StockAdjustment ORDER BY createdAt DESC").all<any>();
          if (res.results && res.results.length > 0) {
            return jsonResponse(res.results.map((a: any) => ({
              ...a,
              status: a.approvedById ? "APPROVED" : "PENDING_APPROVAL",
              quantity: Math.abs(Number(a.quantityDelta || 0))
            })).map(enrichAdjustment));
          }
        } catch (e) { console.error("[D1 Error]", e); }
      }
      return jsonResponse(fallbackState.adjustments.map(enrichAdjustment));
    }

    if (path === "/adjustments" && method === "POST") {
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
      const adj = {
        id: uid("adj"),
        adjustmentNumber: `ADJ-${Date.now().toString().slice(-6)}`,
        itemId: body.itemId,
        batchId: body.batchId || null,
        storeId: body.storeId || "store-main",
        type: body.type || (Number(body.discrepancy || body.quantity || 0) >= 0 ? "GAIN" : "LOSS"),
        quantity: Math.abs(Number(body.discrepancy ?? body.quantity ?? 0)),
        quantityDelta: Number(body.discrepancy ?? body.quantityDelta ?? body.quantity ?? 0),
        reason: body.reason || "Physical count variance",
        status: "PENDING_APPROVAL",
        createdAt: new Date().toISOString(),
        createdById: user?.id || "usr-admin"
      };
      fallbackState.adjustments.unshift(adj);

      if (env.DB) {
        try {
          await env.DB.prepare(
            `INSERT INTO StockAdjustment (id, adjustmentNumber, itemId, batchId, quantityDelta, reason, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
          ).bind(adj.id, adj.adjustmentNumber, adj.itemId, adj.batchId, adj.quantityDelta, adj.reason).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichAdjustment(adj), 201);
    }

    if (path.startsWith("/adjustments/") && path.endsWith("/approve") && method === "POST") {
      const id = getPathSegment(path, 1);
      const adj = await getOrFetchAdjustment(id, env);
      if (!adj) return jsonResponse({ message: "Adjustment not found" }, 404);
      adj.status = "APPROVED";

      if (env.DB) {
        try {
          await env.DB.prepare("UPDATE StockAdjustment SET approvedById = ? WHERE id = ?")
            .bind(user?.id || "usr-admin", adj.id).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichAdjustment(adj));
    }

    if (path.startsWith("/adjustments/") && path.endsWith("/reject") && method === "POST") {
      const id = getPathSegment(path, 1);
      const adj = await getOrFetchAdjustment(id, env);
      if (!adj) return jsonResponse({ message: "Adjustment not found" }, 404);
      adj.status = "REJECTED";

      if (env.DB) {
        try {
          await env.DB.prepare("UPDATE StockAdjustment SET approvedById = 'REJECTED' WHERE id = ?")
            .bind(adj.id).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichAdjustment(adj));
    }

    if (path === "/disposals" && method === "GET") {
      if (env.DB) {
        try {
          const res = await env.DB.prepare("SELECT * FROM StockDisposal ORDER BY createdAt DESC").all<any>();
          if (res.results && res.results.length > 0) {
            return jsonResponse(res.results.map(enrichDisposal));
          }
        } catch (e) { console.error("[D1 Error]", e); }
      }
      return jsonResponse(fallbackState.disposals.map(enrichDisposal));
    }

    if (path === "/disposals" && method === "POST") {
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
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

      if (env.DB) {
        try {
          await env.DB.prepare(
            `INSERT INTO StockDisposal (id, disposalNumber, itemId, batchId, quantity, reasonId, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', datetime('now'), datetime('now'))`
          ).bind(disp.id, disp.disposalNumber, disp.itemId || (disp.lines?.[0]?.itemId || "item-screw"), disp.batchId || null, Number(disp.quantity || disp.lines?.[0]?.quantity || 1), disp.reasonId || "disp-01").run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichDisposal(disp), 201);
    }

    if (path.startsWith("/disposals/") && path.endsWith("/approve") && method === "POST") {
      const id = getPathSegment(path, 1);
      const disp = await getOrFetchDisposal(id, env);
      if (!disp) return jsonResponse({ message: "Disposal request not found" }, 404);
      disp.status = "APPROVED";

      if (env.DB) {
        try {
          await env.DB.prepare("UPDATE StockDisposal SET status = 'APPROVED', approvedById = ?, updatedAt = datetime('now') WHERE id = ?")
            .bind(user?.id || "usr-admin", disp.id).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichDisposal(disp));
    }

    if (path.startsWith("/disposals/") && path.endsWith("/reject") && method === "POST") {
      const id = getPathSegment(path, 1);
      let body: any;
      try { body = await request.json(); } catch { return jsonResponse({ message: "Invalid JSON" }, 400); }
      const disp = await getOrFetchDisposal(id, env);
      if (!disp) return jsonResponse({ message: "Disposal request not found" }, 404);
      disp.status = "REJECTED";
      disp.rejectionNotes = body.notes || body.reason || "Rejected by Approver";

      if (env.DB) {
        try {
          await env.DB.prepare("UPDATE StockDisposal SET status = 'REJECTED', approvedById = ?, remarks = ?, updatedAt = datetime('now') WHERE id = ?")
            .bind(user?.id || "usr-admin", disp.rejectionNotes, disp.id).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichDisposal(disp));
    }

    if (path.startsWith("/disposals/") && path.endsWith("/dispose") && method === "POST") {
      const id = getPathSegment(path, 1);
      const disp = await getOrFetchDisposal(id, env);
      if (!disp) return jsonResponse({ message: "Disposal request not found" }, 404);
      disp.status = "DISPOSED";

      if (env.DB) {
        try {
          await env.DB.prepare("UPDATE StockDisposal SET status = 'DISPOSED', updatedAt = datetime('now') WHERE id = ?")
            .bind(disp.id).run();
        } catch (e) { console.error("[D1 Error]", e); }
      }

      return jsonResponse(enrichDisposal(disp));
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
        vehiclesMetrics: {
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
            "Content-Type": "text/csv; charset=utf-8",
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
    console.error("[Unhandled API Error]", err);
    return jsonResponse({ message: err?.message || "Internal server error" }, 500);
  }
}
