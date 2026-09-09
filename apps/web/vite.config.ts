import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@fmoh/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts")
    }
  },
  clearScreen: false,
  server: {
    host: process.env.TAURI_DEV_HOST ?? "127.0.0.1",
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: true
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
