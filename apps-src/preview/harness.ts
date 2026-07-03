/**
 * Shared dev-harness plumbing for the MCP Apps preview pages. Plays the HOST
 * role using the same official `@modelcontextprotocol/ext-apps` `AppBridge`
 * that a real host (Claude Desktop, VS Code, etc.) uses — not a hand-rolled
 * postMessage responder — so these harnesses stay faithful to the real
 * protocol as it evolves.
 *
 * Deliberately reproduces host-driven CONTAINER SIZING (fixed / flexible /
 * unbounded width) because that's exactly the class of bug that broke the
 * hand-rolled viewers in Claude Desktop (width:0 iframe). The old preview
 * harness gave the iframe a static CSS width and could never have caught it.
 */
import {
  AppBridge,
  PostMessageTransport,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps/app-bridge";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type WidthMode = "fixed" | "flexible" | "unbounded";

export interface HarnessOptions {
  /** The `<iframe>` element the guest is loaded into. */
  iframe: HTMLIFrameElement;
  /** Raw HTML of the production `ui://` resource template (imported `?raw`). */
  template: string;
  /**
   * The production template's `<script src="__APPS_BASE_URL__/...">` is
   * swapped for this dev-mode `<script type="module" src="...">`, pointing
   * at the TS entry so Vite's dev server transforms it on the fly (no build
   * step needed while iterating).
   */
  devScriptTag: string;
  appName: string;
  logEl: HTMLElement;
}

export interface Harness {
  bridge: AppBridge;
  /** Send a tool-result notification once the guest has initialized. */
  sendResult: (result: CallToolResult) => void;
  /** Tear down and recreate the iframe + bridge (re-runs ui/initialize). */
  remount: () => void;
}

function log(el: HTMLElement, msg: string) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.textContent = `${line}\n${el.textContent ?? ""}`.slice(0, 4000);
}

function buildDevHtml(template: string, devScriptTag: string): string {
  const scriptTagPattern = /<script src="__APPS_BASE_URL__\/apps\/[^"]+"><\/script>/;
  if (!scriptTagPattern.test(template)) {
    throw new Error(
      "Preview harness: production template's script tag shape changed — update harness.ts's replacement pattern.",
    );
  }
  return template.replace(scriptTagPattern, devScriptTag);
}

const FALLBACK_WIDTH = 400;

/** The width a well-behaved host commits to up front (see mount()'s note). */
function resolveInitialWidth(dim: McpUiHostContext["containerDimensions"]): number {
  if (dim && "width" in dim && dim.width) return dim.width;
  if (dim && "maxWidth" in dim && dim.maxWidth) return dim.maxWidth;
  return FALLBACK_WIDTH;
}

export function readContainerDimensions(
  modeSelect: HTMLSelectElement,
  valueInput: HTMLInputElement,
): McpUiHostContext["containerDimensions"] {
  const mode = modeSelect.value as WidthMode;
  const value = Number(valueInput.value) || 400;
  if (mode === "fixed") return { width: value, maxHeight: 600 };
  if (mode === "flexible") return { maxWidth: value, maxHeight: 600 };
  return { maxHeight: 600 }; // unbounded width — no width hint at all
}

export function createHarness(
  opts: HarnessOptions,
  getHostContext: () => McpUiHostContext,
): Harness {
  const { iframe, template, devScriptTag, appName, logEl } = opts;
  let bridge!: AppBridge;
  let pendingResult: CallToolResult | null = null;

  function mount() {
    // IMPORTANT: the ext-apps App class's built-in auto-resize reports
    // `window.innerWidth` for width — i.e. an ECHO of the iframe's current
    // CSS width, not a value it computes from content. A host that starts
    // the iframe at width:0 and waits for the guest to "report" a width gets
    // 0 forever (the guest has no way to discover a size the host never gave
    // it). Width must be HOST-SEEDED before the guest connects; `sendSizeChanged`
    // is a confirmation echo, not a discovery mechanism. Only height is
    // genuinely content-driven and safe to start unset.
    const ctx = getHostContext();
    iframe.style.width = `${resolveInitialWidth(ctx.containerDimensions)}px`;
    iframe.style.height = "0px";
    iframe.srcdoc = buildDevHtml(template, devScriptTag);

    bridge = new AppBridge(
      null,
      { name: `${appName}-preview-harness`, version: "1.0.0" },
      { openLinks: {}, logging: {} },
      { hostContext: ctx },
    );

    // Width is deliberately NOT applied from this notification: the guest's
    // built-in auto-resize reports `window.innerWidth`, i.e. an ECHO of
    // whatever width the host already gave the iframe — never a value
    // discovered from content. Applying it back is circular, and the first
    // observer tick fires before layout settles (still reading the
    // pre-seed 0), which would permanently stomp the seeded width. Width
    // stays host-authoritative and static per mount; only height responds.
    bridge.onsizechange = ({ width, height }) => {
      if (height != null) iframe.style.height = `${height}px`;
      log(logEl, `size-changed → width(echo)=${width ?? "?"} height=${height ?? "?"}`);
    };

    bridge.onloggingmessage = ({ level, data }) => {
      log(logEl, `guest ${level}: ${JSON.stringify(data)}`);
    };

    bridge.oninitialized = () => {
      log(logEl, "view initialized");
      if (pendingResult) bridge.sendToolResult(pendingResult);
    };

    const win = iframe.contentWindow;
    if (!win) throw new Error("iframe.contentWindow not available after setting srcdoc");
    const transport = new PostMessageTransport(win, win);
    bridge.connect(transport).catch((err: unknown) => {
      log(logEl, `connect failed: ${String(err)}`);
    });
  }

  mount();

  return {
    get bridge() {
      return bridge;
    },
    sendResult(result) {
      pendingResult = result;
      bridge.sendToolResult(result);
    },
    remount: mount,
  } as Harness;
}
