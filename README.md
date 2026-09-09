# FMOH Inventory Management System

Production-oriented institutional inventory management system for facility stock workflows: item registration, procurement/receiving, inspection, storage coding, issuance, stock monitoring, physical inventory, reconciliation, disposal, audit logging, and reports.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn-style component primitives
- Backend: NestJS, TypeScript, JWT auth, permission-based RBAC
- Database: local SQLite with Prisma ORM
- Reporting: server-generated Excel and PDF exports
- Deployment: standalone local runtime suitable for Tauri desktop packaging

## Implemented MVP Modules

- Requirements analysis, Prisma schema, architecture notes, and project structure docs.
- Auth and RBAC with seeded users for every required role.
- Item master data with soft-deactivation support.
- Goods receiving notes with structured stock source and multi-line GRNs.
- Inspection with accepted/rejected quantities, mandatory rejection reason, barcode fields, and accepted-only ledger posting.
- Immutable stock ledger used for balances.
- Issue request workflow with approval, SIV generation, negative-stock prevention, and automatic FIFO/FEFO allocation.
- Stock monitoring dashboard aggregating low stock, overstock, stock-outs, expired batches, reorder items, movement, consumption, disposal value, and turnover ratio.
- Physical count worksheet generation and variance capture.
- Disposal request, approval, final disposal action, and ledger deduction.
- PDF and Excel export endpoints for the required report categories.
- React operational UI with login, role-filtered sidebar, dashboard landing screen, dark mode, tables, empty/error/loading states, and report download links.

## Known Gaps For Next Increment

- User management UI and CRUD endpoints are modeled but not fully surfaced.
- Adjustment approval posting is modeled through count variance but still needs a dedicated approval endpoint before ledger adjustment entries are posted.
- The current report formatter is generic; production reports should receive polished templates per report type.
- Serial-level fixed asset custody is not yet implemented.
- Toasts and confirmation dialogs should be added around write actions as more write forms are exposed in the UI.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client:

```bash
npm run db:generate
```

4. Create the local SQLite database and seed data:

```bash
npm run db:migrate
npm run db:seed
```

By default, local development uses `apps/api/prisma/data/fmoh-inventory.db`. If `DATABASE_URL` is unset in production, the API stores `fmoh-inventory.db` in the current user's application data directory. You can override that location with `FMOH_DATABASE_PATH`.

5. Start both apps:

```bash
npm run dev
```

API: `http://localhost:3001/api`

Web: `http://localhost:5173`

## SQLite Verification

```bash
npm run db:smoke --workspace apps/api
```

The smoke test exercises item CRUD/search, goods receiving, inspection, storage allocation, stock balance calculation, and valuation report data against SQLite.

## Seeded Credentials

All seeded users use password `Password123!`.

| Role | Email |
| --- | --- |
| System Administrator | `admin@fmoh.local` |
| Storekeeper | `storekeeper@fmoh.local` |
| Department User | `requester@fmoh.local` |
| Approver | `approver@fmoh.local` |
| Viewer/Auditor | `auditor@fmoh.local` |

## Documentation

- [Requirements analysis](docs/requirements-analysis.md)
- [Architecture decisions](docs/architecture.md)
- [Project structure](docs/project-structure.md)
- [UI design system](docs/ui-design-system.md)
