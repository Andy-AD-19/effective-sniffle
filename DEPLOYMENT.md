# FMOH Institutional Inventory System — Deployment Guide

This document outlines the deployment process for the **FMOH Inventory System Web Application** to **Cloudflare Pages / Workers**.

---

## 1. Architectural Separation (Web vs Desktop)

The codebase cleanly separates the **Web Application** from the **Tauri Desktop Application**:

```text
                        FMOH INVENTORY CODEBASE
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
        WEB APPLICATION                        DESKTOP APPLICATION
              │                                         │
       Cloudflare Pages                              Tauri v2
              │                                         │
      Standard Browser                         Windows / macOS / Linux
  (No Rust / Cargo required)                   (Local SQLite / Sidecar)
```

- **Cloudflare / Web**: The web build compiles purely with TypeScript and Vite into static assets (`HTML`, `CSS`, `JS`, `_redirects`, `_headers`). It **does not require Rust, Cargo, Tauri CLI, or native desktop binaries**.
- **Desktop (Tauri)**: The desktop shell in `apps/web/src-tauri` remains intact for offline/desktop distribution and is triggered only via explicit `npm run tauri:*` commands.

---

## 2. Web Production Build

To build only the web application for production:

```bash
# From the root directory:
npm run build:web

# Or directly within apps/web:
npm run build --workspace @fmoh/web
```

### Build Artifacts
The compiled web bundle is output to:
```text
apps/web/dist/
├── _headers             # Cloudflare Pages security & caching headers
├── _redirects           # SPA fallback routing rule (/* -> /index.html 200)
├── assets/              # Minified CSS and JavaScript bundles
└── index.html           # HTML5 application shell
```

---

## 3. Cloudflare Configuration (Pre-configured in Repository)

The repository includes all necessary Cloudflare configuration files:

1. **`wrangler.jsonc` (Root & `apps/web`)**:
   - `pages_build_output_dir`: `dist` (or `apps/web/dist` from root).
   - `compatibility_date`: `2024-09-01`
   - `compatibility_flags`: `["nodejs_compat"]`
2. **`apps/web/public/_redirects`**:
   - Configures Single Page Application (SPA) client-side routing fallback so direct navigation (e.g. `/dashboard`, `/receipts`, `/issues`) works seamlessly on Cloudflare CDN.
3. **`apps/web/public/_headers`**:
   - Adds HTTP security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`) and 1-year immutable caching for static `/assets/*`.

---

## 4. Environment Variables

When deploying the frontend to Cloudflare Pages, configure the following environment variable:

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | Public base URL of your backend API server | `https://api.inventory.fmoh.gov.et` |

> **Note:** If your Cloudflare Pages project proxies API requests on the same origin (e.g., via Cloudflare Worker routes at `/api/*`), you can leave `VITE_API_URL` empty or set it to your custom domain.

---

## 5. Deployment Options (Manual by User)

### Option A: Cloudflare Pages via Git Integration (Recommended)
1. Push your repository to GitHub / GitLab.
2. In the **Cloudflare Dashboard**, navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Configure build settings:
   - **Framework preset**: `Vite`
   - **Root directory**: `apps/web` (or leave empty if using root scripts)
   - **Build command**: `npm run build:web` (or `npm run build`)
   - **Build output directory**: `dist` (or `apps/web/dist` if root directory is `/`)
4. Add environment variable: `VITE_API_URL = https://your-api-domain.com`.
5. Click **Save and Deploy**.

### Option B: Cloudflare Wrangler CLI
When you are ready to deploy manually using Wrangler:

```bash
# 1. Build the production web bundle
npm run build:web

# 2. Deploy to Cloudflare Pages using Wrangler
npx wrangler pages deploy apps/web/dist --project-name fmoh-inventory-web
```

---

## 6. Verification & Health Check

After deployment, verify:
1. **Root Load**: Navigate to your Cloudflare Pages URL (e.g. `https://fmoh-inventory-web.pages.dev`).
2. **SPA Routing**: Refresh on sub-routes (e.g., `/receipts`, `/issues`) to confirm `_redirects` handles SPA fallback without 404 errors.
3. **API Connectivity**: Verify login and data requests against your configured `VITE_API_URL`.
