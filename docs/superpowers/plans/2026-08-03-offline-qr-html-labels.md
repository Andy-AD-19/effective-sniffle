# Offline QR HTML Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw JSON QR scan output with a polished, offline-readable HTML label payload while preserving GS1 and scanner search compatibility.

**Architecture:** Add one shared TypeScript payload builder for the server API and web regression tests, then mirror the same compact HTML data URL generation in the Tauri local API. Existing storage assignment continues to generate label payloads; only the QR payload format changes.

**Tech Stack:** TypeScript, NestJS service layer, Tauri Rust local API, `tsx` regression scripts, npm workspace builds, Cargo check.

## Global Constraints

- QR scan result must work offline without the app or internet.
- End users must see a readable polished HTML page, not raw JSON.
- GS1 GTIN, lot, expiry, location, quantity, and original identifiers must remain visible/searchable.
- Keep implementation DRY in TypeScript by using one builder for server-side QR payloads.
- Preserve existing barcode value and scanner query matching by keeping GS1/text fields inside the generated payload.

---

### Task 1: Server Offline QR Payload Builder

**Files:**
- Create: `apps/api/src/modules/services/qr-label-template.ts`
- Modify: `apps/api/src/modules/services/storage.service.ts`
- Test: `scripts/regression-qr-html-label.ts`

**Interfaces:**
- Produces: `buildOfflineQrLabelDataUrl(payload: QrLabelPayload): string`
- Consumes: storage assignment payload fields already created in `StorageService.assign`

- [ ] Write failing regression asserting a QR payload starts with `data:text/html`, contains FMOH heading, item, batch, location, GS1, and does not expose raw JSON.
- [ ] Run `npx.cmd tsx scripts\regression-qr-html-label.ts` and confirm module/function is missing.
- [ ] Implement `buildOfflineQrLabelDataUrl`.
- [ ] Replace `payloadJson` as the QR `payload` while keeping barcode payload compatible.
- [ ] Run the regression and API build.

### Task 2: Tauri Local API QR Payload Parity

**Files:**
- Modify: `apps/web/src-tauri/src/local_api.rs`
- Test: `cargo check` in `apps/web/src-tauri`

**Interfaces:**
- Produces: local QR `payload` as a `data:text/html;charset=utf-8,` URL.
- Consumes: existing `gs1_json` values and local storage assignment label row.

- [ ] Add Rust helpers to escape HTML and build the same offline QR label data URL.
- [ ] Use the helper where local API creates QR barcode payloads for storage balances.
- [ ] Run `cargo check`.

### Task 3: Full Verification

**Files:**
- Verify changed TypeScript and Rust paths.

- [ ] Run `npx.cmd tsx scripts\regression-qr-html-label.ts`.
- [ ] Run `npm.cmd run build --workspace apps/api`.
- [ ] Run `npm.cmd run build --workspace apps/web`.
- [ ] Run `cargo check` from `apps/web/src-tauri`.
