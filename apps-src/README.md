# MCP Apps guest sources

Source for the Signal Insights MCP Apps guests (SEP-1865): the chart viewer
and export/table viewer that render inside a sandboxed iframe in MCP Apps
hosts (Claude Desktop, VS Code, etc.) after `signal_insights_preview_chart` /
`signal_insights_export_events` run.

Built on the official `@modelcontextprotocol/ext-apps` SDK instead of a
hand-rolled `postMessage` handshake — see "Why the official SDK" below.

## Layout

```
apps-src/
  chart-viewer/main.ts       guest entry — ECharts rendering + PNG fallback
  export-viewer/main.ts      guest entry — table rendering
  shared/echarts-options.ts  pure ECharts option-builder, shared by the guest
                             and the dev harness's mock data types
  preview/                   dev-only harness (see "Local development" below)
```

The corresponding `ui://` resource HTML shells live in
`worker/mcp/ui/*.template.html` (small: styles + a `<script>` tag) and are
registered by `worker/mcp/mcp.ts` via `ext-apps/server`'s `registerAppResource`
/ `registerAppTool`.

## Why the official SDK

The guests used to hand-roll the `ui/initialize` handshake, `appInfo`,
container sizing, and resize reporting directly against the raw
`postMessage` protocol. Every MCP Apps spec/host revision broke something
one at a time (missing `appInfo`, a width:0 iframe feedback loop, an empty
tool-result wiping an already-rendered chart). `@modelcontextprotocol/ext-apps`'s
`App` class owns the handshake and auto-resize, so those classes of bugs are
now the SDK's problem to keep in sync with the spec, not ours.

We use `ext-apps` directly (not `@mcp-ui/server`/`@mcp-ui/client`):
`ext-apps/server`'s `registerAppTool`/`registerAppResource` already are the
correct, spec-matched helpers for SEP-1865 (the `@mcp-ui/*` packages target a
broader/older multi-format `mcp-ui` protocol and, as of writing, pin an
`ext-apps` peer version that's out of sync with what we install). The dev
harness uses `ext-apps/app-bridge`'s `AppBridge`/`PostMessageTransport`
directly rather than `@mcp-ui/client`'s `AppFrame` React wrapper, since the
harness is plain HTML/TS, not React.

## Why the guest JS isn't inlined into the `ui://` resource HTML

Inlining bundles the JS into the string returned by `resources/read`, which
gets compiled into the Worker's SCRIPT bundle (`?raw` import) — counting
toward Cloudflare's ~1MB gzip worker-script limit. ECharts alone is
~300KB+ gzipped. Instead:

- `vite.apps.config.ts` builds each guest as a self-contained classic
  (IIFE) script to `dist/client/apps/*.js`, served as a Worker **static
  asset** via the existing `ASSETS` binding — static assets don't count
  toward the script-size limit.
- The `ui://` resource HTML is a tiny shell (`worker/mcp/ui/*.template.html`)
  that references the built JS by absolute URL, using the `APPS_BASE_URL`
  env var (`wrangler.jsonc`) so it resolves correctly in both local dev and
  production.

Run `bun run build:apps` to build both bundles (also runs as part of
`bun run build`).

## Local development: the preview harness

`apps-src/preview/*.html` are standalone dev pages that play the **host**
role using the same official `ext-apps` `AppBridge` a real host uses (not a
hand-rolled responder), so they stay faithful to the protocol. They let you
render the guests with mock data without a full Worker/Pokey stack.

```bash
bun run dev:apps   # serves apps-src/ at http://localhost:5174 (port may shift if busy — check the printed URL)
```

Open the printed URL directly (it links to both harnesses) — the bare root
has no other content, and Vite's default port shifts up (5175, 5176, ...) if
5174 is already in use by another running instance, so always check the
terminal output rather than assuming 5174. Guest entries are imported
directly (`/chart-viewer/main.ts`) and transformed live by Vite — no build
step needed while iterating.

**Sizing controls matter.** The harness lets you simulate the host's
`containerDimensions` mode (fixed width / flexible maxWidth / unbounded) with
the iframe starting at 0×0 and growing purely from what the guest reports —
faithfully mimicking Claude Desktop. This is deliberate: a static-width
harness (the original one) gave the iframe a real width up front and could
never reproduce the flat-widget bug.

### Why we disable the SDK's `autoResize` (the core sizing fix)

The `ext-apps` `App` class's built-in `autoResize` reports **`window.innerWidth`**
for width — an ECHO of whatever width the host has already given the iframe,
not a value derived from content. Claude Desktop starts the iframe at width 0
and grows it from the width the guest reports. So with `autoResize: true`,
the guest reports `innerWidth` = 0 → host keeps it at 0 → the widget renders
flat ("flashes then gone"). It's a deadlock the guest can never escape by
echoing.

The fix (see `reportSize()` in each guest `main.ts`): construct the `App`
with `{ autoResize: false }` and report size ourselves —

- **width** = the concrete width the host advertised in
  `hostContext.containerDimensions` (`width` → `maxWidth` → a `640` default),
  never a measured/echoed value. The host can actually act on this to size
  the iframe.
- **height** = measured content height (`body.getBoundingClientRect().height`).

If Claude Desktop ever shows a flat/0-width widget again, check that
`hostContext.containerDimensions` still carries a usable width (or that our
default is being applied) — not the SDK's `innerWidth` echo path.

### Harness fidelity notes

- The harness starts the iframe at 0×0 and applies BOTH reported width and
  height (`onsizechange`) — i.e. it trusts the guest's reported width, like
  Claude. If a change here shows a flat widget, so will Claude.
- `remount()` closes the previous `AppBridge` and waits for the iframe
  `load` event before wiring the transport. An earlier version did neither,
  leaking stale bridges that kept posting old host context — a pure harness
  artifact (a real host has one bridge per view) that produced very
  confusing "stuck at the previous width" behavior.
- Vite's dev server has not reliably hot-reloaded edits to these files in
  this environment; if the browser seems to run stale code, fully restart
  `bun run dev:apps` (and make sure no old instance is still holding the
  port — `lsof -nP -iTCP:5174-5178 -sTCP:LISTEN`).
