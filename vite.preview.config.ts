import { defineConfig } from "vite";

/**
 * Dev server for the MCP Apps preview harnesses (apps-src/preview/*.html).
 * `root: "apps-src"` so the harness pages can import the sibling guest
 * entries (apps-src/chart-viewer/main.ts, apps-src/export-viewer/main.ts)
 * as absolute dev-server paths, transformed on the fly by Vite — no build
 * step needed while iterating on the guest apps.
 *
 * Not used in production; the real ui:// resources are served from the
 * bundles built by vite.apps.config.ts (see package.json `build:apps`).
 */
export default defineConfig({
  root: "apps-src",
  server: {
    port: 5174,
  },
});
