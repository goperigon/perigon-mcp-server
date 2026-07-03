/**
 * Signal Insights chart viewer — MCP Apps guest (SEP-1865).
 *
 * Rendered in a sandboxed iframe by MCP Apps-capable hosts (Claude Desktop,
 * VS Code, etc.) after signal_insights_preview_chart runs. Receives chart
 * data via `ontoolresult` and renders interactive ECharts, falling back to
 * the PNG shipped alongside each chart when interactive rendering can't run
 * (unsupported chart shape, ECharts failing to init, etc.) so the widget
 * never silently shows nothing.
 *
 * Built with the official `@modelcontextprotocol/ext-apps` SDK: the `App`
 * class owns the `ui/initialize` handshake (incl. `appInfo`) and auto-resize
 * reporting, so this file only implements chart-viewer-specific logic
 * (theming, ECharts rendering, PNG fallback).
 */
import { App, PostMessageTransport, type McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import * as echarts from "echarts";
import { buildEChartOptions, type ChartData } from "../shared/echarts-options";

interface ChartOutput {
  chart?: ChartData | null;
  png?: string | null;
  text?: string | null;
}

interface ChartsStructuredContent {
  charts?: ChartOutput[];
}

const DEFAULT_VIEW_WIDTH = 640;

let isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
let hasCharts = false;

const body = document.body;
const chartsEl = document.getElementById("charts")!;

function collapse() {
  body.classList.add("collapsed");
}

function show() {
  body.classList.remove("collapsed");
}

// ─── Theming (SEP-1865 §Theming) ─────────────────────────────────────────
function applyHostContext(ctx: McpUiHostContext | undefined) {
  if (!ctx) return;
  if (ctx.theme !== undefined) {
    isDark = ctx.theme === "dark";
  }
  if (ctx.styles?.variables) {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(ctx.styles.variables)) {
      if (v != null) root.style.setProperty(k, v);
    }
  }
  if (ctx.styles?.css?.fonts) {
    let tag = document.getElementById("host-fonts") as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement("style");
      tag.id = "host-fonts";
      document.head.appendChild(tag);
    }
    tag.textContent = ctx.styles.css.fonts;
  }
  applyContainerWidth(ctx.containerDimensions);
  reRenderAll();
}

// Width is host-owned. We resolve it to a concrete pixel value from the
// host's container bounds (fixed `width`, else `maxWidth`, else a default)
// rather than letting our width:100% content report a measured value back —
// that's circular (100% of an unset iframe width is 0) and is what caused
// the interactive widget to render at width:0 in Claude Desktop. Setting a
// concrete width here means the SDK's built-in autoResize (which reports
// `document.documentElement.scrollWidth`) reports this real value instead.
function applyContainerWidth(dim: McpUiHostContext["containerDimensions"]) {
  const root = document.documentElement;
  let width = DEFAULT_VIEW_WIDTH;
  if (dim && "width" in dim && dim.width) width = dim.width;
  else if (dim && "maxWidth" in dim && dim.maxWidth) width = dim.maxWidth;
  root.style.width = `${width}px`;

  if (dim && "height" in dim && dim.height) {
    root.style.height = "100vh";
  } else if (dim && "maxHeight" in dim && dim.maxHeight) {
    root.style.maxHeight = `${dim.maxHeight}px`;
  }
}

function reRenderAll() {
  document.querySelectorAll<HTMLElement>(".chart-echart").forEach((el) => {
    const inst = echarts.getInstanceByDom(el);
    if (inst) echarts.dispose(el);
    const data = (el as HTMLElement & { __chartData?: ChartData }).__chartData;
    if (data) {
      const opts = buildEChartOptions(data, isDark);
      if (opts) initEChart(el, opts);
    }
  });
}

// ─── Rendering ────────────────────────────────────────────────────────────
function echartsReady(): boolean {
  return typeof echarts !== "undefined" && typeof echarts.init === "function";
}

/** Returns true on success. Never throws — the caller falls back to PNG. */
function initEChart(el: HTMLElement, options: Record<string, unknown>): boolean {
  if (!echartsReady()) return false;
  try {
    const chart = echarts.init(el, null, { renderer: "canvas" });
    chart.setOption(options);
    new ResizeObserver(() => chart.resize()).observe(el);
    return true;
  } catch {
    return false;
  }
}

function makeTitle(text: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "chart-title";
  el.textContent = text;
  return el;
}

/**
 * Static PNG fallback (the figure is also shipped as base64 PNG in
 * structuredContent). Used whenever the interactive render can't run.
 */
function appendPng(wrap: HTMLElement, c: ChartOutput): boolean {
  if (!c.png) return false;
  const div = document.createElement("div");
  div.className = "chart-img";
  const img = document.createElement("img");
  img.src = `data:image/png;base64,${c.png}`;
  img.alt = c.chart?.title ?? c.text ?? "Chart";
  div.appendChild(img);
  wrap.appendChild(div);
  return true;
}

/** Render one chart entry into `wrap`. Returns true if anything rendered. */
function renderChartEntry(wrap: HTMLElement, c: ChartOutput): boolean {
  if (c.chart && echartsReady()) {
    if (c.chart.type === "superchart" && Array.isArray(c.chart.elements)) {
      if (c.chart.title) wrap.appendChild(makeTitle(c.chart.title));
      let rendered = 0;
      for (const sub of c.chart.elements as unknown as ChartData[]) {
        const subOpts = buildEChartOptions(sub, isDark);
        if (!subOpts) continue;
        if (sub.title) wrap.appendChild(makeTitle(sub.title));
        const sel = document.createElement("div");
        sel.className = "chart-echart";
        (sel as HTMLElement & { __chartData?: ChartData }).__chartData = sub;
        wrap.appendChild(sel);
        if (initEChart(sel, subOpts)) rendered++;
        else wrap.removeChild(sel);
      }
      if (rendered > 0) return true;
      wrap.innerHTML = ""; // interactive failed → fall through to PNG
    } else {
      const options = buildEChartOptions(c.chart, isDark);
      if (options) {
        if (c.chart.title) wrap.appendChild(makeTitle(c.chart.title));
        const cel = document.createElement("div");
        cel.className = "chart-echart";
        (cel as HTMLElement & { __chartData?: ChartData }).__chartData = c.chart;
        wrap.appendChild(cel);
        if (initEChart(cel, options)) return true;
        wrap.innerHTML = ""; // interactive failed → fall through to PNG
      }
    }
  }

  // Fallbacks: PNG first, then raw JSON for unknown chart shapes.
  if (appendPng(wrap, c)) return true;
  if (c.chart) {
    const uel = document.createElement("div");
    uel.className = "chart-unknown";
    uel.textContent = JSON.stringify(c.chart, null, 2);
    wrap.appendChild(uel);
    return true;
  }
  return false;
}

function renderCharts(charts: ChartOutput[]) {
  chartsEl.innerHTML = "";
  for (const c of charts) {
    const wrap = document.createElement("div");
    wrap.className = "chart-wrap";
    if (renderChartEntry(wrap, c)) chartsEl.appendChild(wrap);
  }
  if (!chartsEl.children.length) collapse();
}

// ─── MCP Apps wiring ──────────────────────────────────────────────────────
const app = new App(
  { name: "signal-insights-chart-viewer", version: "1.0.0" },
  { availableDisplayModes: ["inline"] },
  { autoResize: true },
);

app.ontoolresult = (result) => {
  const sc = result.structuredContent as ChartsStructuredContent | undefined;
  if (sc?.charts?.length) {
    hasCharts = true;
    show();
    renderCharts(sc.charts);
  } else if (!hasCharts) {
    // Only collapse if we never rendered. A later empty re-delivery (e.g.
    // session restore without structuredContent) must not wipe an
    // already-shown chart.
    collapse();
  }
};

// `getHostContext()` returns the fully-merged context (the SDK merges the
// notification's partial params internally before this fires).
app.onhostcontextchanged = () => {
  applyHostContext(app.getHostContext());
};

app.onteardown = () => ({});

app
  .connect(new PostMessageTransport(window.parent, window.parent))
  .then(() => {
    applyHostContext(app.getHostContext());
  })
  .catch((err) => {
    console.error("[chart-viewer] failed to connect to host", err);
  });
