# Architecture Decisions

## Ledger

The stock ledger is append-only and is the source of truth for balances. Every stock-changing action writes a signed quantity entry with references to its source document. Current balance queries aggregate ledger entries by item, batch, and location. A future materialized balance table may be added, but it must be reconciled from the ledger.

## Approval Workflow

Approvals use a generic `ApprovalRequest` model with a type, target entity, status, decision metadata, and requester/approver links. Issuance, adjustments, and disposals reuse the same lifecycle and permission checks.

## RBAC

Permissions are granular strings attached to roles in code and enforced by Nest guards/decorators. Frontend navigation consumes the same permission names from the authenticated profile, avoiding scattered role-name conditionals.

## Audit Logging

Critical service methods create `AuditLog` records with actor, action, entity type, entity id, IP/user agent where available, and before/after JSON snapshots serialized as text for SQLite portability. This can later be moved to an interceptor for broader automatic coverage.

## FIFO/FEFO

The ledger service calculates available positive lots from receipt/adjustment-in entries minus previous deductions. Allocation sorts by expiry date for expiry-tracked/perishable items and by receipt timestamp for general inventory.
