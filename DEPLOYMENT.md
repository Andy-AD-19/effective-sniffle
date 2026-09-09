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
1. In the **Cloudflare Dashboard**, navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git** (Select `Andy-AD-19/effective-sniffle`).
2. Configure build settings:
   - **Configuration Type 1 (Setting Root Directory to `apps/web`)**:
     - **Root directory**: `apps/web`
     - **Framework preset**: `Vite`
     - **Build command**: `npm run build`
     - **Build output directory**: `dist`
   - **Configuration Type 2 (Using Repository Root `/`)**:
     - **Root directory**: `/` (leave blank)
     - **Framework preset**: `None` / `Vite`
     - **Build command**: `npm run build`
     - **Build output directory**: `apps/web/dist`
     - **Deploy command** (if prompted): `npm run deploy` or leave blank
3. Add environment variable: `VITE_API_URL = https://your-api-domain.com`.
4. Click **Save and Deploy**.

### Option B: Cloudflare Wrangler CLI
When you deploy directly using Wrangler from the terminal:

```bash
# From repository root:
npm run build
npm run deploy

# Or directly targeting the output directory:
npx wrangler pages deploy apps/web/dist --project-name fmoh-inventory-web
```

---

## 6. Backend API & Database Cloud Hosting

The repository includes a ready-to-deploy containerized configuration for the **NestJS Backend + SQLite/PostgreSQL Database**:

- `Dockerfile`: Multi-stage production container with automatic Prisma generation, database migrations/setup, and seed scripts.
- `render.yaml`: Blueprint for 1-click cloud deployment on [Render](https://render.com) with persistent database storage.

### Option A: Deploy Backend to Render (Free / Low Cost)
1. Log into **[Render.com](https://render.com)**.
2. Click **New +** > **Blueprint** (or **Web Service**).
3. Connect your GitHub repository `https://github.com/Andy-AD-19/effective-sniffle`.
4. Render will automatically detect `render.yaml` and `Dockerfile`, build the container, create the persistent database volume, run migrations, and start the API.
5. Render assigns you a public HTTPS URL (e.g. `https://fmoh-inventory-api.onrender.com`).
6. In your **Cloudflare Web App** (on the login screen or via Cloudflare `VITE_API_URL` variable), set the URL to your Render API address.

### Option B: Deploy Backend to Railway / Fly.io / VPS
1. Push this repository to **Railway** or **Fly.io** using Docker.
2. Set Environment Variables:
   - `PORT`: `3001`
   - `DATABASE_URL`: `file:/app/data/inventory.db`
   - `JWT_SECRET`: `your_random_production_jwt_secret`
3. Point your Cloudflare frontend's `VITE_API_URL` to your Railway/Fly API domain.

---

## 7. Verification & Health Check

After deployment, verify:
1. **Root Load**: Navigate to your Cloudflare Pages URL (e.g. `https://fmoh-inventory-web.pages.dev`).
2. **SPA Routing**: Refresh on sub-routes (e.g., `/receipts`, `/issues`) to confirm client-side routing works without 404 errors.
3. **API Connectivity**: Click **Configure Server API URL** on the login screen, test the connection to your cloud API endpoint, and sign in.

