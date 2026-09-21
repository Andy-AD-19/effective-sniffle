# TASKS.md — FMOH Inventory Bug Diagnosis

> **Architecture note:** The deployed Cloudflare build runs entirely from [`src/worker.ts`](file:///d:/FMOH%20INVENTORY/src/worker.ts) (3697 lines). The NestJS backend in `apps/api/` is NOT deployed — it's the Tauri/desktop path only. Every bug below must be fixed in `worker.ts` (and `main.tsx` for UI).

---

## 1. Audit Logs — Empty (Screenshot: 0 records) ⬤ CRITICAL [DONE]
> *Fixed: Added `recordAudit` helper to write to D1 and in-memory, applied across 15+ mutation routes, and updated `GET /audit-logs` to query D1.*

**Root cause:**
- [`src/worker.ts:3437-3438`](file:///d:/FMOH%20INVENTORY/src/worker.ts#L3437-L3438) — `GET /audit-logs` returns `fallbackState.auditLogs`, which is initialized as `[]` on every cold start ([line 301](file:///d:/FMOH%20INVENTORY/src/worker.ts#L301)).
- Audit entries ARE pushed to `fallbackState.auditLogs.unshift(...)` during master-data CRUD ([lines 1502, 1561, 1602](file:///d:/FMOH%20INVENTORY/src/worker.ts#L1502)), item creation ([line 2043](file:///d:/FMOH%20INVENTORY/src/worker.ts#L2043)), but **only in-memory**. Cloudflare Workers are stateless; `fallbackState` resets on every isolate recycle.
- **No `INSERT INTO AuditLog` is ever executed** — confirmed: zero hits for `INSERT INTO.*AuditLog` in worker.ts. The D1 `AuditLog` table exists ([d1/schema.sql:236](file:///d:/FMOH%20INVENTORY/d1/schema.sql#L236)) but is never written to.
- `GET /audit-logs` never queries D1 either — it returns the empty in-memory array only.
- Most operations (GRN create, issue approve, disposal, physical count, user CRUD) never push to `fallbackState.auditLogs` at all — only master-data and item-create do.

**Fix spec:**
- Every `fallbackState.auditLogs.unshift(...)` call must also `INSERT INTO AuditLog` in D1 (4 existing sites + all missing operations).
- Add audit writes for: receipt create/submit, inspection, issue create/approve/reject/voucher, disposal create/approve/reject/dispose, physical count open/submit, adjustment approve/reject, user create/update, storage allocate. Match the events in [`apps/api/src/modules/services/`](file:///d:/FMOH%20INVENTORY/apps/api/src/modules/services) — there are 30+ `audit.record()` calls there; mirror each in worker.ts.
- `GET /audit-logs` must query `SELECT * FROM AuditLog ORDER BY createdAt DESC LIMIT 500` from D1 first, fall back to in-memory only if D1 fails.
- Column mapping: D1 table has `action, entity, entityId, userId, details`; in-memory has `action, entityType, entityId, actorId`. Normalize on INSERT.

**Acceptance check:**
- Create a department, receive a GRN, issue stock. Reload page. Audit Logs shows ≥3 records with actor, action, entity, and timestamp.

---

## 2. Reports — Inaccurate Data and Wrong Status ⬤ CRITICAL [DONE]
> *Fixed: Rewrote `worker.ts` `/reports/*` handler to dispatch by type, use D1 queries, apply `reportStatus` logic, and flatten lines accurately. Fixed CSV downloads.*

**Root cause:**
- [`src/worker.ts:3598-3666`](file:///d:/FMOH%20INVENTORY/src/worker.ts#L3598-L3666) — The `/reports/*` handler is a single generic block that **ignores the report type** entirely. It maps `fallbackState.items` with hardcoded values:
  - `unitCost: 10.0` (line 3621)
  - `bal = fallbackState.balances.find(b => b.itemId === i.id)?.quantityOnHand || 100` — falls back to **100** when no balance exists (line 3609)
  - `status: bal > (i.reorderLevel || 10) ? "ADEQUATE" : "LOW_STOCK"` — binary status, no disposal/stock-out/below-minimum logic (line 3623)
- There are NO type-specific report queries (no disposal report, no issue report, no physical-count report, etc.). The NestJS `ReportsService` at [`apps/api/src/modules/services/reports.service.ts`](file:///d:/FMOH%20INVENTORY/apps/api/src/modules/services/reports.service.ts) has the correct logic with 15+ report types, each with proper Prisma queries — but this code is never used on Cloudflare.
- Excel export returns CSV disguised as `.xlsx` (line 3628-3650). PDF export returns plaintext with `Content-Type: application/pdf` (line 3653-3663). Neither is a valid file.

**Fix spec:**
- Rewrite `/reports/*` handler to dispatch by `type` parameter (stock-status, disposal, receipt, issue, store-issue-voucher, physical-count, reconciliation-adjustment, valuation, consumption, stock-out, reorder, fast-moving, slow-moving, audit-log, asset-custody).
- For each type, query the correct D1 table(s) — mirror the queries from `reports.service.ts:15-58`.
- Port `reportStatus()` logic from [`reports.service.ts:339-354`](file:///d:/FMOH%20INVENTORY/apps/api/src/modules/services/reports.service.ts#L339-L354): use `minimumStock`, `reorderLevel`, `maximumStock` thresholds (Stock Out / Below Minimum / Low Stock / Normal / Overstock).
- Port `flattenRow()` from [`reports.service.ts:182-215`](file:///d:/FMOH%20INVENTORY/apps/api/src/modules/services/reports.service.ts#L182-L215) to produce correct per-line rows.
- Disposal report specifically: query `StockDisposal` table, include item + reason enrichment, compute status from disposal.status (PENDING_APPROVAL / APPROVED / DISPOSED / REJECTED), not from stock level.
- For Excel: use a proper CSV with correct headers per report type, or integrate the ExcelJS vendor shim. For PDF: generate structured text or return the JSON data and let the frontend render.

**Acceptance check:**
- Disposal report shows disposal-specific rows with correct statuses (PENDING_APPROVAL, APPROVED, DISPOSED).
- Stock-status report shows actual balances from `StockLocationBalance`, not "100" for every item.
- Stock-out report filters to items with 0 balance.

---

## 3. Physical Counts — Not Working ⬤ HIGH [DONE]
> *Fixed: `POST /physical-counts` now queries balances to build lines and writes `PhysicalCountLine` to D1. `submit` detects variance, writes `StockAdjustment` records, and saves to D1.*

**Root cause:**
- [`src/worker.ts:3220-3246`](file:///d:/FMOH%20INVENTORY/src/worker.ts#L3220-L3246) — `POST /physical-counts` creates a count with `lines: []` (hardcoded empty array, line 3232). It never queries `StockLocationBalance` to populate lines with system quantities. Compare to NestJS [`physical-count.service.ts:10-34`](file:///d:/FMOH%20INVENTORY/apps/api/src/modules/services/physical-count.service.ts#L10-L34) which calls `this.ledger.balances()` and creates `PhysicalCountLine` records.
- `GET /physical-counts` queries `PhysicalCount` table but **not** `PhysicalCountLine` — returns flat rows with no `lines` array ([line 3211-3213](file:///d:/FMOH%20INVENTORY/src/worker.ts#L3211-L3213)).
- `POST /physical-counts/:id/submit` (line 3248-3265): only sets `status = "COMPLETED"` on the in-memory count. It never calculates variance, never creates `StockAdjustment` records, never writes `PhysicalCountLine` to D1.
- D1 `PhysicalCountLine` table has no INSERT anywhere in worker.ts (confirmed: 0 hits).
- D1 `PhysicalCount` INSERT uses wrong column names: `storeId` vs schema's `storeId`, and doesn't insert `cycleType`, `categoryId`.
- Frontend `PhysicalCounts` component ([main.tsx:9569-9719](file:///d:/FMOH%20INVENTORY/apps/web/src/main.tsx#L9569-L9719)) renders correctly IF data is returned — the bug is purely backend.

**Fix spec:**
- `POST /physical-counts`: query `StockLocationBalance` (joined with items) to build count lines. INSERT into both `PhysicalCount` AND `PhysicalCountLine` tables. Return the count with populated `lines[]`.
- `GET /physical-counts`: JOIN `PhysicalCountLine` (and item data) onto each count. Match the NestJS `list()` at [physical-count.service.ts:78-79](file:///d:/FMOH%20INVENTORY/apps/api/src/modules/services/physical-count.service.ts#L78-L79).
- `POST /physical-counts/:id/submit`: for each line, compute `variance = countedQuantity - systemQuantity`. If variance != 0, INSERT a `StockAdjustment` row with status `PENDING_APPROVAL`. Update PhysicalCount status to `PENDING_RECONCILIATION` or `RECONCILED`. Update `PhysicalCountLine` with `countedQuantity` and `discrepancy`. Write all to D1. Add audit log entry.

**Acceptance check:**
- Open a count → lines appear with system quantities matching stock balances.
- Enter different counted quantities → submit → variance shown → adjustment records created in PENDING_APPROVAL status.
- Adjustment shows in Approver portal queue.

---

## 4. Bin Card — Batch/Model/Serial Not Enforced ⬤ HIGH [DONE]
> *Fixed: Added validation in `POST /receipts` to require batch/serial numbers based on item config. Updated `enrichLedgerEntry` to correctly resolve `batchNumber`, `expiryDate`, and compute prices for the Bin Card view.*

**Root cause:**
- [`src/worker.ts:2598`](file:///d:/FMOH%20INVENTORY/src/worker.ts#L2598) — GRN line creation auto-generates a batch number (`BATCH-\${Date.now()}`) even for items that don't track batches. For items that DO track batches (`batchTrackingRequired: true`), there is no validation that the user provided one.
- The bin card data pipeline ([`apps/api/src/modules/services/bin-card.ts`](file:///d:/FMOH%20INVENTORY/apps/api/src/modules/services/bin-card.ts)) correctly reads `movement.batchNumber` and `movement.unitCost`, but the worker's ledger entries often don't populate these fields when creating `StockLedgerEntry` rows.
- **Missing validation in worker.ts GRN creation:** No check for `item.batchTrackingRequired` — contrast with NestJS [`receiving.service.ts:38`](file:///d:/FMOH%20INVENTORY/apps/api/src/modules/services/receiving.service.ts#L38) which throws `BadRequestException` if batch number missing.
- **Model/serial fields:** Schema has `modelNumber String?` and `serialNumber String?` on `Item` ([schema.prisma:148-149](file:///d:/FMOH%20INVENTORY/apps/api/prisma/schema.prisma#L148-L149)), but these are never validated on receipt or tracked per-unit.
- Worker `StockLedgerEntry` inserts ([line 2445](file:///d:/FMOH%20INVENTORY/src/worker.ts#L2445)) pass `batch.unitCost` and `batch.batchNumber`, but these can be null/empty.
- Previous fix set `unitCost` to `0` in bin-card.ts to avoid N/A — but the real fix is populating the data at receipt time.

**Fix spec:**
- **GRN creation validation** (worker.ts `POST /receipts`): look up the item. If `batchTrackingRequired`, reject lines with empty `batchNumber`. If item `kind === 'FIXED_ASSET'`, require `serialNumber` or `modelNumber` if the item definition has them.
- **Frontend validation** (main.tsx, GRN form ~line 6056): already has `isBatchRequired` check — verify it disables submit. Add similar for model/serial when item kind is FIXED_ASSET.
- **Ledger entry population:** when creating `StockLedgerEntry` from receipt allocation, always carry `unitCost`, `batchNumber`, `expiryDate` from the GRN line / batch.
- **D1 `StockLedgerEntry` INSERT** ([worker.ts:2445](file:///d:/FMOH%20INVENTORY/src/worker.ts#L2445)): ensure `batchNumber` and `unitCost` columns are populated.

**Acceptance check:**
- Attempt to receive an item with `batchTrackingRequired: true` without a batch number → error.
- Receive with valid batch number → bin card shows batch no., expiry, and unit price (not N/A).
- Fixed asset receipt without serial/model → error.

---

## 5. Admin Customizations Not Propagated ⬤ MEDIUM [DONE]
> *Fixed: Added `SystemSettings` table + `GET/PATCH /settings` endpoint to worker. Modified UI `roleViews` to expose Master data view to Storekeepers and Approvers. Modified UI to persist and sync theme server-side.*

**Root cause:**
- [`DesktopSettings`](file:///d:/FMOH%20INVENTORY/apps/web/src/main.tsx#L11397) component is desktop-only (Tauri backup/restore). There is **no server-side settings/preferences model** in the schema or worker.
- Theme preferences: no `localStorage` theme key found in main.tsx. The app uses Tailwind's `dark` class (likely via media query or hardcoded). No user-preference persistence exists.
- Master data customizations (departments, categories, units, etc.) DO persist to D1 — screenshot 3 confirms departments work. The "customization" issue is specifically about **visual settings / UI preferences** not being stored server-side.
- Assumption: "customizations" = admin-configured master data (departments, categories, funding sources, disposal reasons, store locations, storage locations). These DO propagate because they're in D1. The issue may be that **non-admin roles can't see the Configuration tab** — `roleViews` ([main.tsx:193-200](file:///d:/FMOH%20INVENTORY/apps/web/src/main.tsx#L193-L200)) only gives `'master'` view to `SYSTEM_ADMINISTRATOR`.

**Fix spec:**
- Add a `SystemSettings` D1 table: `id TEXT PK, key TEXT UNIQUE, value TEXT, updatedAt TEXT`. Store org name, theme preference, default language, etc.
- Add `GET /settings` and `PATCH /settings` routes in worker.ts. `GET` is open to all authenticated users. `PATCH` requires `USER_MANAGE` permission.
- Frontend: load settings on app init, apply theme class (`dark`/`light`/`system`) to `<html>` element. Store in React context, not localStorage.
- For master-data visibility: either add `'master'` to `STOREKEEPER` and `APPROVER` roleViews, or create a read-only configuration view accessible to all roles. The backend permission was already relaxed to `RequireAnyPermission(USER_MANAGE, ITEM_WRITE)` in a previous fix.

**Acceptance check:**
- Admin sets theme to "light" → all users see light theme after reload.
- Storekeeper can access Configuration tab to view/add departments.

---

## 6. Approver and Inspector Portals — Broken Workflows ⬤ MEDIUM [DONE]
> *Fixed: Removed `fallbackState` cache hits (`!issue` etc) in `getOrFetch...` when `env.DB` is present. Isolates now query D1 for every request, resolving stale state bugs.*

**Root cause:**
- **Approver queue** ([worker.ts:3128-3167](file:///d:/FMOH%20INVENTORY/src/worker.ts#L3128-L3167)): queries `StockIssueVoucher WHERE status = 'PENDING_APPROVAL'` — but issue requests are stored in a different table. The D1 schema has `StockIssueVoucher` with `status`, but the issue workflow creates rows with status `PENDING_APPROVAL` in the fallback state's `issues` array, not in `StockIssueVoucher`. The issue approval endpoints (`/issues/:id/approve`) update `fallbackState.issues` but the approver queue queries `StockIssueVoucher` in D1.
- **Inspector queue** ([worker.ts:3169-3205](file:///d:/FMOH%20INVENTORY/src/worker.ts#L3169-L3205)): queries `GoodsReceivingNote WHERE status = 'PENDING_INSPECTION'` — correct table, but GRN status transitions may not persist to D1 on submit (`/receipts/:id/submit` updates in-memory only if D1 write fails silently).
- **Cross-account state:** `fallbackState` is per-isolate. If approver logs in on a different Cloudflare edge node than the storekeeper who created the issue, the in-memory state is empty. Only D1 data survives cross-request.
- **Missing D1 writes on status transitions:** `/issues/:id/approve`, `/issues/:id/reject`, `/disposals/:id/approve` update in-memory status but D1 writes are wrapped in try-catch that silently swallows errors.
- **Table mismatch:** Approver portal UI calls `/issues/:id/approve` but worker stores issues differently than D1 schema expects. `StockIssueVoucher.status` in D1 vs `fallbackState.issues[].status` in-memory — the queue query looks at the wrong table.

**Fix spec:**
- Ensure ALL status transitions (issue approve/reject, disposal approve/reject/dispose, GRN submit for inspection, inspection complete, return inspection) write to D1 reliably. Log D1 errors but don't silently swallow them.
- Fix approver queue to query the correct D1 table for pending issues — likely `StockIssueVoucher` with joined `StockIssueLine`, or a separate `IssueRequest` table if one exists. Verify D1 schema matches what's being queried.
- Inspector queue: ensure GRN status is written to D1 on submit. Ensure inspection results (`/receipts/:id/inspect`) write `Inspection` records and update GRN status in D1.
- Add error feedback in the UI when a D1 write fails instead of showing success.
- Test the full workflow: Storekeeper creates issue → Approver sees it in queue → Approver approves → Storekeeper sees approved status.

**Acceptance check:**
- Log in as storekeeper, create an issue request. Log in as approver (different session), see the issue in the queue. Approve it. Log back in as storekeeper, see "APPROVED" status.
- Log in as storekeeper, create a GRN and submit for inspection. Log in as inspector, see the GRN in queue. Complete inspection. Storekeeper sees "INSPECTED" status.

---

## Shared Dependencies

These issues touch the same code and must be coordinated:

| Shared Code | Issues Affected | Coordination Notes |
|---|---|---|
| `fallbackState` in-memory vs D1 persistence pattern | 1, 3, 5, 6 | Every write to `fallbackState.*` must also write to D1. Every read must try D1 first, fall back to in-memory. Extract a helper: `async function persistAndAudit(env, table, data, auditAction)`. |
| `/reports/*` handler ([worker.ts:3598-3666](file:///d:/FMOH%20INVENTORY/src/worker.ts#L3598-L3666)) | 2 | Complete rewrite. Reference `reports.service.ts` for correct queries per type. Share the `reportStatus()` function with disposal and stock-status logic. |
| D1 `StockLedgerEntry` INSERT ([worker.ts:2445](file:///d:/FMOH%20INVENTORY/src/worker.ts#L2445)) | 2, 4 | Must populate `batchNumber`, `unitCost`, `expiryDate` correctly. Used by both reports (for consumption/issue data) and bin card rendering. |
| Stock status calculation | 2, 3 | `reportStatus()` logic (Normal/Low Stock/Stock Out/Below Minimum/Overstock) should be a shared function used by both reports and dashboard. Currently duplicated with different thresholds. |
| Audit log write pattern | 1, 3, 4, 6 | Create a reusable `writeAuditLog(env, actorId, action, entityType, entityId, details)` function that writes to both `fallbackState.auditLogs` and D1 `AuditLog`. Call it from every mutation handler. |
| Approval/inspection status transitions | 3, 6 | Physical count submit creates adjustments → those must appear in approver queue. Disposal approve/dispose → must update stock. Ensure D1 writes are atomic where possible (batch statements). |
