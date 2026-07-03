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
 * class owns the `ui/initialize` handshake (incl. `appInfo`). We deliberately
 * DISABLE the SDK's built-in `autoResize` and report size ourselves — see the
 * "Sizing" note below for why.
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
// Width the host has committed to for this view (see the "Sizing" note on
// reportSize). Starts at the default until the host tells us its bounds.
let containerWidth = DEFAULT_VIEW_WIDTH;

const body = document.body;
const chartsEl = document.getElementById("charts")!;

function collapse() {
  body.classList.add("collapsed");
  reportSize(true);
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

// ─── Sizing ─────────────────────────────────────────────────────────────
// We DON'T use the SDK's built-in autoResize: it reports `window.innerWidth`
// for width, which is just an echo of whatever width the host already gave
// the iframe. Claude Desktop starts the iframe at width 0 and grows it from
// the width WE report — so echoing innerWidth reports 0 forever and the
// widget renders flat (0-wide, "flashes then gone"). Instead we report the
// concrete width the host advertised in `containerDimensions`, which the
// host can actually act on to size the iframe. Height stays content-driven.
function applyContainerWidth(dim: McpUiHostContext["containerDimensions"]) {
  const root = document.documentElement;
  containerWidth = DEFAULT_VIEW_WIDTH;
  if (dim && "width" in dim && dim.width) containerWidth = dim.width;
  else if (dim && "maxWidth" in dim && dim.maxWidth) containerWidth = dim.maxWidth;
  root.style.width = `${containerWidth}px`;

  if (dim && "height" in dim && dim.height) {
    root.style.height = "100vh";
  } else if (dim && "maxHeight" in dim && dim.maxHeight) {
    root.style.maxHeight = `${dim.maxHeight}px`;
  }
  reportSize();
}

/**
 * Report our size to the host. Width = the host-advertised container width
 * (never a measured/echoed value — see the note on applyContainerWidth).
 * Height = measured content height. `collapsed` reports 0×0 so the host
 * removes the box entirely.
 */
function reportSize(collapsed = false) {
  if (!connected) return;
  app.sendSizeChanged(
    collapsed
      ? { width: 0, height: 0 }
      : {
          width: containerWidth,
          height: Math.ceil(body.getBoundingClientRect().height),
        },
  );
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
let connected = false;

const app = new App(
  { name: "signal-insights-chart-viewer", version: "1.0.0" },
  { availableDisplayModes: ["inline"] },
  { autoResize: false }, // we report size ourselves — see reportSize()
);

app.ontoolresult = (result) => {
  const sc = result.structuredContent as ChartsStructuredContent | undefined;
  if (sc?.charts?.length) {
    hasCharts = true;
    show();
    renderCharts(sc.charts);
    reportSize();
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
    connected = true;
    applyHostContext(app.getHostContext());
    // Re-report whenever content reflows (chart appears, fonts load, etc.).
    new ResizeObserver(() => reportSize()).observe(body);
    reportSize();
  })
  .catch((err) => {
    console.error("[chart-viewer] failed to connect to host", err);
  });
