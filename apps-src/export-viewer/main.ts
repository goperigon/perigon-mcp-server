/**
 * Signal Insights export/table viewer — MCP Apps guest (SEP-1865).
 *
 * Rendered in a sandboxed iframe after signal_insights_export_events runs.
 * Built with the official `@modelcontextprotocol/ext-apps` SDK. Sizing is left
 * to the SDK's `autoResize` and the host — see chart-viewer/main.ts's
 * "Sizing" note (mirrors PostHog's shipping MCP UI apps).
 */
import { App, PostMessageTransport, type McpUiHostContext } from "@modelcontextprotocol/ext-apps";

interface ExportData {
  name?: string | null;
  columns?: string[];
  preview?: Record<string, unknown>[];
  rowCount?: number;
}

interface ExportStructuredContent {
  export?: ExportData;
}

const COLLAPSED_ROWS = 10;

let hasTable = false;

const body = document.body;
const exportEl = document.getElementById("export")!;

function collapse() {
  body.classList.add("collapsed");
}

function show() {
  body.classList.remove("collapsed");
}

// ─── Theming (SEP-1865 §Theming) ─────────────────────────────────────────
// Sizing is left entirely to the SDK's autoResize + the host; we only apply
// theming here. See chart-viewer/main.ts's "Sizing" note.
function applyHostContext(ctx: McpUiHostContext | undefined) {
  if (!ctx) return;
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
}

// ─── Rendering ────────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '<span class="cell-null">null</span>';
  }
  if (typeof value === "object") {
    const json = JSON.stringify(value);
    const display = json.length > 200 ? `${json.slice(0, 200)}…` : json;
    return `<span class="cell-object" title="${escapeAttr(json)}">${escapeHtml(display)}</span>`;
  }
  const str = String(value);
  if (str.length > 200) {
    return `<span title="${escapeAttr(str)}">${escapeHtml(str.slice(0, 200))}…</span>`;
  }
  return escapeHtml(str);
}

function renderTable(data: ExportData) {
  exportEl.innerHTML = "";

  let columns = data.columns ?? [];
  const preview = data.preview ?? [];
  const rowCount = data.rowCount ?? 0;

  if (data.name) {
    const title = document.createElement("div");
    title.className = "export-title";
    title.textContent = data.name;
    exportEl.appendChild(title);
  }

  const summary = document.createElement("div");
  summary.className = "summary";
  if (preview.length === 0) {
    summary.textContent = "No rows exported";
  } else if (preview.length >= rowCount) {
    summary.textContent = `${rowCount} row${rowCount !== 1 ? "s" : ""}`;
  } else {
    summary.textContent = `Showing ${preview.length} of ${rowCount.toLocaleString()} rows`;
  }
  exportEl.appendChild(summary);

  if (preview.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No data to display";
    exportEl.appendChild(empty);
    return;
  }

  if (columns.length === 0) {
    const seen = new Set<string>();
    for (const row of preview) {
      for (const k of Object.keys(row)) seen.add(k);
    }
    columns = Array.from(seen);
  }

  let isExpanded = false;

  function buildTable(expanded: boolean) {
    const visibleRows = expanded ? preview : preview.slice(0, COLLAPSED_ROWS);
    const canExpand = preview.length > COLLAPSED_ROWS;

    exportEl.querySelector(".table-scroll")?.remove();
    exportEl.querySelector(".expand-bar")?.remove();

    const scroll = document.createElement("div");
    scroll.className = "table-scroll";
    if (expanded) {
      scroll.style.maxHeight = "400px";
      scroll.style.overflowY = "auto";
      scroll.style.overflowX = "auto";
    } else {
      scroll.style.overflow = "hidden";
    }

    const table = document.createElement("table");

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    for (const col of columns) {
      const th = document.createElement("th");
      th.textContent = col;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const row of visibleRows) {
      const tr = document.createElement("tr");
      for (const col of columns) {
        const td = document.createElement("td");
        td.innerHTML = formatCell(row[col]);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    scroll.appendChild(table);
    exportEl.appendChild(scroll);

    if (canExpand) {
      const bar = document.createElement("div");
      bar.className = "expand-bar";
      bar.textContent = expanded
        ? "Collapse"
        : `Show all ${preview.length} preview rows`;
      bar.onclick = () => {
        isExpanded = !isExpanded;
        buildTable(isExpanded);
      };
      exportEl.appendChild(bar);
    }
  }

  buildTable(false);
}

// ─── MCP Apps wiring ──────────────────────────────────────────────────────
const app = new App(
  { name: "signal-insights-export-viewer", version: "1.0.0" },
  { availableDisplayModes: ["inline"] },
  { autoResize: true }, // SDK observes body/root and reports size to the host
);

app.ontoolresult = (result) => {
  const sc = result.structuredContent as ExportStructuredContent | undefined;
  if (sc?.export) {
    hasTable = true;
    show();
    renderTable(sc.export);
  } else if (!hasTable) {
    collapse();
  }
};

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
    console.error("[export-viewer] failed to connect to host", err);
  });
