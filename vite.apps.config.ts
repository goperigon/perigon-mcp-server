import { defineConfig } from "vite";
import path from "path";

/**
 * Builds ONE MCP Apps guest bundle (chart-viewer or export-viewer) as a
 * self-contained, classic (non-module) script, selected via the
 * VITE_APPS_ENTRY env var (see package.json `build:apps`).
 *
 * Rollup's `iife` output format only supports a single entry per build (no
 * shared/dynamic chunks), so each guest app gets its own `vite build`
 * invocation rather than a single multi-entry config.
 *
 * These are served as Worker STATIC ASSETS under `dist/client/apps/*.js`
 * (via the existing ASSETS binding — see wrangler.jsonc), NOT inlined into
 * the `ui://` resource HTML. The resource HTML (worker/mcp/ui/*.template.html)
 * is a tiny shell that references these bundles by absolute URL
 * (APPS_BASE_URL, injected at resources/read time). This keeps ECharts
 * (~330KB gzipped) out of the Worker's ~1MB gzip script-size limit.
 *
 * Run AFTER the main `vite build` (see package.json `build` script) — this
 * config only adds files under dist/client/apps/ and must not clear the rest
 * of dist/client (the SPA build output), hence `emptyOutDir: false`.
 */
const ENTRIES: Record<string, string> = {
  "chart-viewer": "apps-src/chart-viewer/main.ts",
  "export-viewer": "apps-src/export-viewer/main.ts",
};

const entryName = process.env.VITE_APPS_ENTRY;
if (!entryName || !ENTRIES[entryName]) {
  throw new Error(
    `VITE_APPS_ENTRY must be one of: ${Object.keys(ENTRIES).join(", ")} (got ${JSON.stringify(entryName)})`,
  );
}

export default defineConfig({
  build: {
    outDir: "dist/client/apps",
    emptyOutDir: false,
    target: "es2020",
    lib: {
      entry: path.resolve(__dirname, ENTRIES[entryName]!),
      name: entryName.replace(/-/g, "_"),
      formats: ["iife"],
      fileName: () => `${entryName}.js`,
    },
  },
});
