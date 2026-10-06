# Issue 1: Admin Role Missing Permissions (DONE)

- **Symptom:** System Administrator cannot access or perform actions restricted to other roles like Storekeeper.
- **Root cause / suspected files:** 
  - `packages/shared/src/index.ts` (`rolePermissions.SYSTEM_ADMINISTRATOR` lacks required permissions like `ITEM_WRITE`, `RECEIPT_WRITE`).
  - `apps/api/src/modules/auth/permissions.guard.ts` (Strict requirement with no hardcoded admin bypass).
  - `apps/web/src/main.tsx` (`roleNavViews`, `viewRules`, and hardcoded `user.role === 'STOREKEEPER'` checks on the dashboard).
- **Fix spec:**
  - Update `packages/shared/src/index.ts` to make `SYSTEM_ADMINISTRATOR` permissions a superset of all available permissions.
  - In `apps/web/src/main.tsx`, add all missing views (`items`, `storage`, `ledger`, `counts`, etc.) to `roleNavViews.SYSTEM_ADMINISTRATOR`.
  - In `apps/web/src/main.tsx`, inject `'SYSTEM_ADMINISTRATOR'` into every restricted roles array within `viewRules`.
  - In `apps/web/src/main.tsx`, update the dashboard quick actions and stats sections to render for `SYSTEM_ADMINISTRATOR` (e.g., `user.role === 'STOREKEEPER' || user.role === 'SYSTEM_ADMINISTRATOR'`).
- **Acceptance check:** Admin user can successfully navigate to all views, see all dashboard widgets, and perform every storekeeper action.

---

# Issue 2: GRN Donation Table Blank Columns (DONE)

- **Symptom:** The Inspector GRN list table shows blank data for GRN №, Supplier/Donor, Item, and Qty Received.
- **Root cause / suspected files:** 
  - `apps/web/src/main.tsx` (`InspectorPortalSection` DataTable column bindings).
  - `apps/api/src/modules/services/return.service.ts` (`getInspectorQueue()` payload structure).
  - `apps/api/prisma/schema.prisma` (`quantityReceived` Decimal type).
- **Fix spec:**
  - Update `quantityReceived` column in `apps/web/src/main.tsx` to include a render function: `render: (row) => String(row.quantityReceived ?? '')` to prevent Prisma `Decimal` serialization issues from rendering blank or crashing.
  - Verify if `queue.pendingGrns` is being populated by `res.pendingReceipts` (which returns `GoodsReceivingNote[]` instead of `GoodsReceivingLine[]`). If so, the frontend bindings `row.grn?.grnNumber` and `row.item?.description` evaluate to undefined. Adjust the frontend bindings to handle either payload (e.g., fallback to `row.grnNumber` and `row.supplierDonor?.name`), or strictly enforce the `/inspector/queue` payload type.
- **Acceptance check:** The GRN list in the inspector portal displays correct GRN numbers, supplier names, item descriptions, and stringified received quantities for pending donation records.

---

**Assumptions:**
- `return.service.ts` correctly executes `include: { grn: true, item: true }`, but the frontend either receives a different fallback payload structure (like `pendingReceipts`) or silently fails to render `Decimal` values natively.
- No other API interceptors are stripping the nested `grn` or `item` relations before they reach the frontend.
