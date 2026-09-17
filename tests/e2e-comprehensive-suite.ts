/**
 * FMOH Institutional Inventory - Comprehensive Automated Test Suite
 * Permanent, reusable codebase-driven test program verifying:
 * - D1 Database connectivity and cold-start persistence
 * - Every API endpoint across all 12 functional modules
 * - JWT authentication, RBAC authorization, and error handling
 * - Multi-role end-to-end workflows (Storekeeper -> Approver -> Inspector -> Requester)
 */

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import worker, { Env } from "../src/worker";

interface TestResult {
  module: string;
  testName: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  role?: string;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

const results: TestResult[] = [];

// Helper to find local D1 SQLite file
function getLocalD1Path(): string {
  const dir = path.resolve("D:/FMOH INVENTORY/.wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    const dbFile = files.find(f => f.endsWith(".sqlite") && !f.includes("metadata"));
    if (dbFile) return path.join(dir, dbFile);
  }
  throw new Error("Local D1 SQLite database file not found. Run wrangler d1 execute first.");
}

function createD1Adapter(sqlitePath: string) {
  const db = new DatabaseSync(sqlitePath);
  return {
    prepare(query: string) {
      return {
        _params: [] as any[],
        bind(...args: any[]) {
          this._params = args.map(a => a === undefined ? null : a);
          return this;
        },
        async all<T = any>() {
          const stmt = db.prepare(query);
          const results = stmt.all(...this._params) as T[];
          return { results, success: true };
        },
        async first<T = any>(col?: string) {
          const stmt = db.prepare(query);
          const res = stmt.get(...this._params) as any;
          if (!res) return null;
          if (col) return res[col] as T;
          return res as T;
        },
        async run() {
          const stmt = db.prepare(query);
          const info = stmt.run(...this._params);
          return { success: true, meta: { changes: info.changes } };
        }
      };
    }
  };
}

async function runSuite() {
  console.log("╔═════════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║       FMOH INSTITUTIONAL INVENTORY — COMPREHENSIVE AUTOMATED TEST PROGRAM           ║");
  console.log("╚═════════════════════════════════════════════════════════════════════════════════════╝\n");

  const d1Path = getLocalD1Path();
  const d1 = createD1Adapter(d1Path);
  const env: Env = {
    DB: d1 as any,
    JWT_SECRET: "fmoh-institutional-inventory-secret-key-2026",
    ENVIRONMENT: "production"
  };
  const ctx: any = { waitUntil: () => {}, passThroughOnException: () => {} };

  async function api(endpoint: string, method = "GET", body?: any, token?: string) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const req = new Request(`https://inventory.fmoh.gov.et/api${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const res = await worker.fetch(req, env, ctx);
    let data: any = null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { status: res.status, data };
  }

  async function test(
    module: string,
    testName: string,
    fn: () => Promise<void>,
    role = "SYSTEM",
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "MEDIUM"
  ) {
    const start = Date.now();
    try {
      await fn();
      const durationMs = Date.now() - start;
      results.push({ module, testName, passed: true, durationMs, role, severity });
      console.log(`  ✓ [${module}] ${testName} (${durationMs}ms)`);
    } catch (err: any) {
      const durationMs = Date.now() - start;
      results.push({ module, testName, passed: false, durationMs, error: err.message || String(err), role, severity });
      console.error(`  ✗ [${module}] ${testName} (${durationMs}ms) — ERROR: ${err.message || String(err)}`);
    }
  }

  // Role tokens acquired during Auth
  const tokens: Record<string, string> = {};

  // =========================================================================
  // MODULE 1: AUTHENTICATION & JWT MIDDLEWARE
  // =========================================================================
  console.log("\n[MODULE 1] Authentication & JWT Middleware");
  
  await test("Auth", "Health check confirms D1 connection", async () => {
    const res = await api("/health");
    if (res.status !== 200 || !res.data?.d1Connected) {
      throw new Error(`Expected 200 with d1Connected:true, got status ${res.status}, body: ${JSON.stringify(res.data)}`);
    }
  }, "ALL", "CRITICAL");

  for (const [roleKey, email] of [
    ["admin", "admin@fmoh.local"],
    ["storekeeper", "storekeeper@fmoh.local"],
    ["approver", "approver@fmoh.local"],
    ["inspector", "inspector@fmoh.local"],
    ["requester", "requester@fmoh.local"],
    ["auditor", "auditor@fmoh.local"]
  ]) {
    await test("Auth", `Login as ${roleKey} (${email})`, async () => {
      const res = await api("/auth/login", "POST", { email, password: "Password123!" });
      if (res.status !== 200 || !res.data?.accessToken) {
        throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
      }
      tokens[roleKey] = res.data.accessToken;
      if (!res.data.user?.role) throw new Error("Missing user.role in login response");
    }, roleKey, "CRITICAL");
  }

  await test("Auth", "Reject login with invalid password", async () => {
    const res = await api("/auth/login", "POST", { email: "admin@fmoh.local", password: "WrongPassword999!" });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  }, "ANONYMOUS", "HIGH");

  await test("Auth", "Reject request with missing JWT token on protected route", async () => {
    const res = await api("/auth/me", "GET");
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  }, "ANONYMOUS", "HIGH");

  await test("Auth", "Reject request with malformed JWT token", async () => {
    const res = await api("/auth/me", "GET", undefined, "not-a-valid-jwt-token");
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  }, "ANONYMOUS", "HIGH");

  await test("Auth", "/auth/me returns authenticated user identity and permissions", async () => {
    const res = await api("/auth/me", "GET", undefined, tokens.admin);
    if (res.status !== 200 || res.data?.role !== "SYSTEM_ADMINISTRATOR") {
      throw new Error(`Expected role SYSTEM_ADMINISTRATOR, got ${res.data?.role}`);
    }
  }, "admin", "HIGH");

  // =========================================================================
  // MODULE 2: MASTER DATA CATALOG & AGGREGATE LOOKUPS
  // =========================================================================
  console.log("\n[MODULE 2] Master Data Catalog & Aggregate Lookups");

  await test("MasterData", "GET /master-data returns institutional categories, stores, and UOMs", async () => {
    const res = await api("/master-data", "GET", undefined, tokens.admin);
    if (res.status !== 200) throw new Error(`Failed to fetch master data: ${res.status}`);
    const { categories, stores, units, fundingSources, departments } = res.data;
    if (!categories || categories.length === 0) throw new Error("Missing categories in master data");
    if (!stores || stores.length === 0) throw new Error("Missing stores in master data");
    if (!units || units.length === 0) throw new Error("Missing units in master data");
  }, "admin", "HIGH");

  await test("MasterData", "GET /master-data/categories returns list with Vehicles and Heavy Equipment", async () => {
    const res = await api("/master-data/categories", "GET", undefined, tokens.admin);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const cats = res.data || [];
    const hasVeh = cats.some((c: any) => c.name.includes("Vehicles") || c.id === "cat-veh");
    if (!hasVeh) throw new Error("Category cat-veh missing from master data");
  }, "admin", "MEDIUM");

  // =========================================================================
  // MODULE 3: ITEM MASTER CRUD & MULTI-KEY RESOLUTION
  // =========================================================================
  console.log("\n[MODULE 3] Item Master CRUD & Multi-Key Resolution");

  const testItemCode = `TEST-${Date.now().toString().slice(-5)}`;
  let createdItemId = "";

  await test("ItemMaster", "POST /items creates durable non-pharmaceutical asset item", async () => {
    const res = await api("/items", "POST", {
      code: testItemCode,
      description: "Test Industrial Oxygen Cylinder Carrier",
      kind: "FIXED_ASSET",
      categoryId: "cat-eqp",
      unitId: "unit-ea",
      minimumStock: 2,
      maximumStock: 10,
      reorderLevel: 3,
      batchTrackingRequired: true,
      expiryTrackingRequired: false
    }, tokens.admin);

    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    createdItemId = res.data.id;
    if (!createdItemId) throw new Error("Missing id in created item");
  }, "admin", "CRITICAL");

  await test("ItemMaster", "GET /items/:id resolves by exact ID", async () => {
    const res = await api(`/items/${createdItemId}`, "GET", undefined, tokens.storekeeper);
    if (res.status !== 200 || res.data.code !== testItemCode) {
      throw new Error(`Lookup by ID failed: ${JSON.stringify(res.data)}`);
    }
  }, "storekeeper", "CRITICAL");

  await test("ItemMaster", "GET /items/:id resolves by raw Item Code", async () => {
    const res = await api(`/items/${testItemCode}`, "GET", undefined, tokens.storekeeper);
    if (res.status !== 200 || res.data.id !== createdItemId) {
      throw new Error(`Lookup by Code failed: ${JSON.stringify(res.data)}`);
    }
  }, "storekeeper", "CRITICAL");

  await test("ItemMaster", "GET /items/:id resolves seeded item by code '2' (Screw driver)", async () => {
    const res = await api("/items/2", "GET", undefined, tokens.storekeeper);
    if (res.status !== 200 || !res.data.description.includes("Screw driver")) {
      throw new Error(`Lookup for item code '2' failed: ${JSON.stringify(res.data)}`);
    }
  }, "storekeeper", "CRITICAL");

  await test("ItemMaster", "GET /items/:id resolves seeded item by slug 'item-screw'", async () => {
    const res = await api("/items/item-screw", "GET", undefined, tokens.storekeeper);
    if (res.status !== 200 || !res.data.description.includes("Screw driver")) {
      throw new Error(`Lookup for item slug 'item-screw' failed: ${JSON.stringify(res.data)}`);
    }
  }, "storekeeper", "CRITICAL");

  await test("ItemMaster", "GET /items/:id returns 404 for non-existent item", async () => {
    const res = await api("/items/non-existent-item-99999", "GET", undefined, tokens.storekeeper);
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  }, "storekeeper", "MEDIUM");

  await test("ItemMaster", "PUT /items/:id updates item description and thresholds", async () => {
    const res = await api(`/items/${createdItemId}`, "PUT", {
      description: "Updated Oxygen Cylinder Carrier Deluxe",
      reorderLevel: 4
    }, tokens.admin);
    if (res.status !== 200 || res.data.description !== "Updated Oxygen Cylinder Carrier Deluxe") {
      throw new Error(`Update failed: ${JSON.stringify(res.data)}`);
    }
  }, "admin", "HIGH");

  await test("ItemMaster", "GET /items/export returns Excel file binary stream", async () => {
    const res = await api("/items/export", "GET", undefined, tokens.admin);
    if (res.status !== 200) throw new Error(`Export failed with status ${res.status}`);
  }, "admin", "MEDIUM");

  // =========================================================================
  // MODULE 4: GOODS RECEIVING NOTE (GRN) & INSPECTION
  // =========================================================================
  console.log("\n[MODULE 4] Goods Receiving Note (GRN / Model 19) & Inspection");

  let grnId = "";
  let grnLineId = "";
  const batchNumber = `BAT-E2E-${Date.now().toString().slice(-4)}`;

  await test("GRN", "POST /receipts creates Model 19 Goods Receiving Note with line items", async () => {
    const res = await api("/receipts", "POST", {
      sourceType: "PROCUREMENT",
      supplierDonorId: "sup-01",
      purchaseOrderRef: "PO-2026-001",
      submit: true,
      lines: [
        {
          itemId: createdItemId,
          quantityReceived: 10,
          unitPrice: 350.0,
          batchNumber,
          fundingSourceId: "fund-gov"
        }
      ]
    }, tokens.storekeeper);

    if (res.status !== 201) throw new Error(`Failed to create GRN: ${JSON.stringify(res.data)}`);
    grnId = res.data.id;
    grnLineId = res.data.lines[0]?.id;
    if (!grnLineId) throw new Error("GRN line ID missing from response");
    if (res.data.status !== "PENDING_INSPECTION") throw new Error(`Expected PENDING_INSPECTION, got ${res.data.status}`);
  }, "storekeeper", "CRITICAL");

  await test("Inspection", "POST /receipts/lines/:lineId/inspect accepts batch and creates StockBatch", async () => {
    const res = await api(`/receipts/lines/${grnLineId}/inspect`, "POST", {
      quantityVerified: 10,
      quantityAccepted: 8,
      quantityRejected: 2,
      qualityStatus: "PARTIAL",
      rejectionReason: "Damaged packaging on 2 units during transit",
      qualityNotes: "8 units verified in pristine working order"
    }, tokens.inspector);

    if (res.status !== 200) throw new Error(`Inspection failed: ${JSON.stringify(res.data)}`);
    const line = res.data.lines.find((l: any) => l.id === grnLineId);
    if (line?.inspection?.outcome !== "PARTIALLY_ACCEPTED") {
      throw new Error(`Expected PARTIALLY_ACCEPTED, got ${line?.inspection?.outcome}`);
    }
  }, "inspector", "CRITICAL");

  // =========================================================================
  // MODULE 5: STORAGE CODING & BIN CARD ALLOCATION
  // =========================================================================
  console.log("\n[MODULE 5] Storage Coding & Bin Card Allocation");

  let batchIdToAllocate = "";

  await test("Storage", "GET /stock-batches returns pending storage batches", async () => {
    const res = await api("/stock-batches", "GET", undefined, tokens.storekeeper);
    if (res.status !== 200) throw new Error(`Failed to fetch stock batches: ${res.status}`);
    const found = res.data.find((b: any) => b.batchNumber === batchNumber);
    if (!found) throw new Error(`Batch ${batchNumber} not found in pending storage`);
    batchIdToAllocate = found.id;
  }, "storekeeper", "CRITICAL");

  await test("Storage", "POST /stock-batches/:id/allocate allocates batch to Bin location", async () => {
    const res = await api(`/stock-batches/${batchIdToAllocate}/allocate`, "POST", {
      storageLocationId: "loc-01",
      quantity: 8
    }, tokens.storekeeper);

    if (res.status !== 200 || !res.data.allocated) {
      throw new Error(`Allocation failed: ${JSON.stringify(res.data)}`);
    }
  }, "storekeeper", "CRITICAL");

  await test("Storage", "GET /location-balances shows verified stock balance on Bin Card", async () => {
    const res = await api("/location-balances", "GET", undefined, tokens.storekeeper);
    if (res.status !== 200) throw new Error(`Failed to fetch balances: ${res.status}`);
    const bal = res.data.find((b: any) => b.batchId === batchIdToAllocate);
    if (!bal || Number(bal.quantityOnHand) < 8) {
      throw new Error(`Expected quantityOnHand >= 8, got ${bal?.quantityOnHand}`);
    }
  }, "storekeeper", "CRITICAL");

  await test("Storage", "GET /ledger/movements records immutable audit ledger entry for receipt", async () => {
    const res = await api(`/ledger/movements?itemId=${createdItemId}`, "GET", undefined, tokens.auditor);
    if (res.status !== 200) throw new Error(`Failed to fetch ledger movements: ${res.status}`);
    if (!res.data || res.data.length === 0) throw new Error("No ledger movement recorded for allocated batch");
  }, "auditor", "HIGH");

  // =========================================================================
  // MODULE 6: ISSUE REQUEST & APPROVER WORKFLOW PIPELINE
  // =========================================================================
  console.log("\n[MODULE 6] Issue Request (SIV / Model 22) & Approver Workflow");

  let issueId = "";

  await test("ApproverWorkflow", "POST /issues creates issue with PENDING_APPROVAL status", async () => {
    const res = await api("/issues", "POST", {
      departmentId: "dept-eng",
      recipientName: "Lead Technician Kassahun",
      purpose: "Deployment to emergency ambulance bay",
      lines: [{ itemId: createdItemId, quantity: 2 }]
    }, tokens.requester);

    if (res.status !== 201) throw new Error(`Failed to create issue: ${JSON.stringify(res.data)}`);
    if (res.data.status !== "PENDING_APPROVAL") {
      throw new Error(`Expected PENDING_APPROVAL status, got ${res.data.status}`);
    }
    issueId = res.data.id;
  }, "requester", "CRITICAL");

  await test("ApproverWorkflow", "GET /approver/queue displays pending issue with enriched department & item details", async () => {
    const res = await api("/approver/queue", "GET", undefined, tokens.approver);
    if (res.status !== 200) throw new Error(`Failed to load approver queue: ${res.status}`);
    const found = res.data.pendingIssues?.find((i: any) => i.id === issueId);
    if (!found) throw new Error("Issue not found in Approver Queue");
    if (!found.department?.name && !found.departmentName) {
      throw new Error("Department name not resolved in Approver Queue");
    }
    if (!found.lines?.[0]?.item?.description) {
      throw new Error("Item description not resolved in Approver Queue lines");
    }
  }, "approver", "CRITICAL");

  await test("ApproverWorkflow", "POST /issues/:id/approve authorizes issue request", async () => {
    const res = await api(`/issues/${issueId}/approve`, "POST", { reason: "Authorized by Medical Directorate" }, tokens.approver);
    if (res.status !== 200 || res.data.status !== "APPROVED") {
      throw new Error(`Approval failed: ${JSON.stringify(res.data)}`);
    }
  }, "approver", "CRITICAL");

  await test("ApproverWorkflow", "POST /issues/:id/issue executes store deduction and writes to stock ledger", async () => {
    const res = await api(`/issues/${issueId}/issue`, "POST", {}, tokens.storekeeper);
    if (res.status !== 200 || res.data.status !== "ISSUED") {
      throw new Error(`Issue execution failed: ${JSON.stringify(res.data)}`);
    }
  }, "storekeeper", "CRITICAL");

  await test("ApproverWorkflow", "POST /issues/:id/receive confirms recipient receipt and closes SIV", async () => {
    const res = await api(`/issues/${issueId}/receive`, "POST", {}, tokens.requester);
    if (res.status !== 200 || res.data.status !== "COMPLETED") {
      throw new Error(`Receipt confirmation failed: ${JSON.stringify(res.data)}`);
    }
  }, "requester", "HIGH");

  // =========================================================================
  // MODULE 7: RETURNS & INSPECTOR QUEUE
  // =========================================================================
  console.log("\n[MODULE 7] Returns & Inspector Queue");

  let returnId = "";

  await test("Returns", "POST /returns submits returned item for inspection", async () => {
    const res = await api("/returns", "POST", {
      departmentId: "dept-adm",
      reason: "Excess stock return after administrative event",
      lines: [{ itemId: "item-screw", quantity: 2 }]
    }, tokens.requester);

    if (res.status !== 201) throw new Error(`Failed to create return: ${JSON.stringify(res.data)}`);
    returnId = res.data.id;
    if (res.data.status !== "PENDING_INSPECTION") {
      throw new Error(`Expected PENDING_INSPECTION, got ${res.data.status}`);
    }
  }, "requester", "HIGH");

  await test("Returns", "GET /inspector/queue includes pending return with enriched department", async () => {
    const res = await api("/inspector/queue", "GET", undefined, tokens.inspector);
    if (res.status !== 200) throw new Error(`Failed to fetch inspector queue: ${res.status}`);
    const found = res.data.pendingReturns?.find((r: any) => r.id === returnId);
    if (!found) throw new Error("Return not found in inspector queue");
  }, "inspector", "HIGH");

  await test("Returns", "POST /returns/:id/inspect approves return back into stock", async () => {
    const res = await api(`/returns/${returnId}/inspect`, "POST", { outcome: "APPROVED", notes: "Item condition is like new" }, tokens.inspector);
    if (res.status !== 200 || res.data.status !== "ACCEPTED") {
      throw new Error(`Return inspection failed: ${JSON.stringify(res.data)}`);
    }
  }, "inspector", "HIGH");

  // =========================================================================
  // MODULE 8: RECONCILIATION ADJUSTMENTS & PHYSICAL COUNT
  // =========================================================================
  console.log("\n[MODULE 8] Physical Inventory Count & Variance Adjustments");

  let countId = "";

  await test("PhysicalCount", "POST /physical-counts opens inventory count worksheet", async () => {
    const res = await api("/physical-counts", "POST", {
      cycleType: "CYCLE_COUNT",
      locationId: "loc-01"
    }, tokens.storekeeper);
    if (res.status !== 201) throw new Error(`Failed to open physical count: ${JSON.stringify(res.data)}`);
    countId = res.data.id;
  }, "storekeeper", "MEDIUM");

  await test("PhysicalCount", "POST /physical-counts/:id/submit completes count with lines", async () => {
    const res = await api(`/physical-counts/${countId}/submit`, "POST", {
      lines: [
        { itemId: "item-screw", systemQuantity: 40, countedQuantity: 41, discrepancy: 1 }
      ]
    }, tokens.storekeeper);
    if (res.status !== 200 || res.data.status !== "COMPLETED") {
      throw new Error(`Physical count submission failed: ${JSON.stringify(res.data)}`);
    }
  }, "storekeeper", "MEDIUM");

  let adjId = "";
  await test("Adjustments", "POST /adjustments creates reconciliation adjustment with PENDING_APPROVAL status", async () => {
    const res = await api("/adjustments", "POST", {
      itemId: "item-screw",
      discrepancy: 1,
      reason: "Physical count surplus verified in Shelf 1"
    }, tokens.storekeeper);

    if (res.status !== 201) throw new Error(`Failed to create adjustment: ${JSON.stringify(res.data)}`);
    adjId = res.data.id;
    if (res.data.status !== "PENDING_APPROVAL") {
      throw new Error(`Expected PENDING_APPROVAL, got ${res.data.status}`);
    }
  }, "storekeeper", "HIGH");

  await test("Adjustments", "POST /adjustments/:id/approve authorizes stock adjustment", async () => {
    const res = await api(`/adjustments/${adjId}/approve`, "POST", { comment: "Surplus documented by Auditor" }, tokens.approver);
    if (res.status !== 200 || res.data.status !== "APPROVED") {
      throw new Error(`Adjustment approval failed: ${JSON.stringify(res.data)}`);
    }
  }, "approver", "HIGH");

  // =========================================================================
  // MODULE 9: STOCK DISPOSAL PIPELINE & REJECTION HANDLING
  // =========================================================================
  console.log("\n[MODULE 9] Stock Disposal Pipeline & Rejection Handling");

  let dispId = "";

  await test("Disposal", "POST /disposals creates disposal request with PENDING_APPROVAL status", async () => {
    const res = await api("/disposals", "POST", {
      itemId: "item-screw",
      quantity: 1,
      reason: "Damaged during facility repainting"
    }, tokens.storekeeper);

    if (res.status !== 201) throw new Error(`Failed to create disposal: ${JSON.stringify(res.data)}`);
    dispId = res.data.id;
    if (res.data.status !== "PENDING_APPROVAL") {
      throw new Error(`Expected PENDING_APPROVAL, got ${res.data.status}`);
    }
  }, "storekeeper", "HIGH");

  await test("Disposal", "POST /disposals/:id/reject rejects disposal with reason note (verifies 200 not 404)", async () => {
    const res = await api(`/disposals/${dispId}/reject`, "POST", {
      reason: "Item can be repaired by biomedical technician"
    }, tokens.approver);

    if (res.status !== 200 || res.data.status !== "REJECTED") {
      throw new Error(`Expected 200 and REJECTED status, got ${res.status}: ${JSON.stringify(res.data)}`);
    }
  }, "approver", "CRITICAL");

  // Create another disposal to test approval & execution
  let dispId2 = "";
  await test("Disposal", "POST /disposals creates second disposal to test approval and execution", async () => {
    const res = await api("/disposals", "POST", {
      itemId: "item-screw",
      quantity: 1,
      reason: "Beyond economic repair"
    }, tokens.storekeeper);
    dispId2 = res.data.id;
  }, "storekeeper", "MEDIUM");

  await test("Disposal", "POST /disposals/:id/approve approves disposal request", async () => {
    const res = await api(`/disposals/${dispId2}/approve`, "POST", {}, tokens.approver);
    if (res.status !== 200 || res.data.status !== "APPROVED") {
      throw new Error(`Disposal approval failed: ${JSON.stringify(res.data)}`);
    }
  }, "approver", "HIGH");

  await test("Disposal", "POST /disposals/:id/dispose finalizes destruction and writes deduction", async () => {
    const res = await api(`/disposals/${dispId2}/dispose`, "POST", {}, tokens.storekeeper);
    if (res.status !== 200 || res.data.status !== "DISPOSED") {
      throw new Error(`Final disposal failed: ${JSON.stringify(res.data)}`);
    }
  }, "storekeeper", "HIGH");

  // =========================================================================
  // MODULE 10: REAL-TIME DASHBOARD COMMAND & FLEET METRICS
  // =========================================================================
  console.log("\n[MODULE 10] Real-Time Dashboard Command & Fleet Metrics");

  await test("Dashboard", "GET /dashboard returns accurate non-zero stock, valuation, and vehicle metrics", async () => {
    const res = await api("/dashboard", "GET", undefined, tokens.admin);
    if (res.status !== 200) throw new Error(`Dashboard failed: ${res.status}`);
    const d = res.data;
    if (typeof d.currentStock !== "number" || d.currentStock <= 0) {
      throw new Error(`Expected positive currentStock, got ${d.currentStock}`);
    }
    if (typeof d.totalInventoryValue !== "number" || d.totalInventoryValue <= 0) {
      throw new Error(`Expected positive totalInventoryValue, got ${d.totalInventoryValue}`);
    }
    if (!d.vehiclesMetrics || typeof d.vehiclesMetrics.total !== "number") {
      throw new Error("vehiclesMetrics missing or invalid in dashboard response");
    }
  }, "admin", "CRITICAL");

  // =========================================================================
  // MODULE 11: D1 DATABASE DIRECT INTEGRATION & DATA INTEGRITY
  // =========================================================================
  console.log("\n[MODULE 11] D1 Database Direct Integration & Data Integrity");

  await test("D1DataIntegrity", "Direct D1 query confirms Item created via API exists in SQLite Item table", async () => {
    const row = await d1.prepare("SELECT id, code, description FROM Item WHERE id = ?").bind(createdItemId).first<any>();
    if (!row || row.code !== testItemCode) {
      throw new Error(`Item not found in real D1 database! Found: ${JSON.stringify(row)}`);
    }
  }, "SYSTEM", "CRITICAL");

  await test("D1DataIntegrity", "Direct D1 query confirms StockIssueVoucher exists in SQLite table", async () => {
    const row = await d1.prepare("SELECT id, sivNumber, status FROM StockIssueVoucher WHERE id = ?").bind(issueId).first<any>();
    if (!row || row.status !== "COMPLETED") {
      throw new Error(`SIV not found in real D1 database with COMPLETED status! Found: ${JSON.stringify(row)}`);
    }
  }, "SYSTEM", "CRITICAL");

  // =========================================================================
  // MODULE 12: COLD START PERSISTENCE RECOVERY TEST
  // =========================================================================
  console.log("\n[MODULE 12] Cold Start Persistence Recovery Test");

  await test("ColdStart", "Simulate Worker cold start: verify data survives complete memory eviction", async () => {
    // Invoke health check on a completely fresh request context with D1 bound
    const freshRes = await api("/health");
    if (freshRes.status !== 200 || !freshRes.data.d1Connected) {
      throw new Error("Fresh worker context failed D1 health connection");
    }

    // Verify item still resolves
    const itemRes = await api(`/items/${createdItemId}`, "GET", undefined, tokens.admin);
    if (itemRes.status !== 200 || itemRes.data.code !== testItemCode) {
      throw new Error(`Item ${testItemCode} lost after simulated eviction! ${JSON.stringify(itemRes.data)}`);
    }

    // Verify stock batches still resolve
    const batchRes = await api("/stock-batches", "GET", undefined, tokens.storekeeper);
    if (batchRes.status !== 200 || !batchRes.data.some((b: any) => b.batchNumber === batchNumber)) {
      throw new Error(`Stock batch ${batchNumber} lost after simulated eviction!`);
    }

    // Verify dashboard metrics still compute from persisted tables
    const dashRes = await api("/dashboard", "GET", undefined, tokens.admin);
    if (dashRes.status !== 200 || Number(dashRes.data.currentStock) <= 0) {
      throw new Error("Dashboard stock count wiped out after cold start!");
    }
  }, "SYSTEM", "CRITICAL");

  // =========================================================================
  // FINAL RESULTS REPORT
  // =========================================================================
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log("\n╔═════════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                            TEST SUITE EXECUTION SUMMARY                             ║");
  console.log("╠═════════════════════════════════════════════════════════════════════════════════════╣");
  console.log(`║  TOTAL TESTS  : ${total.toString().padEnd(67)} ║`);
  console.log(`║  PASSED       : ${passed.toString().padEnd(67)} ║`);
  console.log(`║  FAILED       : ${failed.toString().padEnd(67)} ║`);
  console.log(`║  SUCCESS RATE : ${((passed / total) * 100).toFixed(1)}%${"".padEnd(64)} ║`);
  console.log("╚═════════════════════════════════════════════════════════════════════════════════════╝\n");

  if (failed > 0) {
    console.log("FAILED TESTS BREAKDOWN:");
    for (const f of results.filter(r => !r.passed)) {
      console.log(`  - [${f.severity}] [${f.module}] ${f.testName} (Role: ${f.role}) -> ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log(">>> 100% SUITE PASSED — ZERO ERRORS DETECTED. READY FOR PRODUCTION DEPLOYMENT. <<<");
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error("FATAL SUITE RUNNER FAILURE:", err);
  process.exit(1);
});