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
  let bridge: AppBridge | null = null;
  let pendingResult: CallToolResult | null = null;
  let mountToken = 0;

  function mount() {
    const token = ++mountToken;

    // Tear down the previous bridge so its message listener stops responding.
    // Without this, remounts accumulate stale bridges (each with a live
    // window listener) that keep posting old host context — an artifact that
    // does not exist in a real host (one bridge per view, no reuse).
    bridge?.close().catch(() => {});
    bridge = null;

    // Faithfully mimic Claude Desktop: the iframe starts at 0×0 and the host
    // grows BOTH dimensions from whatever the guest reports via
    // `size-changed`. This is the crucial part of the harness — an earlier
    // version pre-seeded a CSS width, which masked the real bug (a guest that
    // reports width:0, e.g. via the SDK's innerWidth-echo autoResize, renders
    // flat). The guest must report a real, host-advertised width for anything
    // to show; if this harness shows a flat 0-wide widget, so will Claude.
    const ctx = getHostContext();
    iframe.style.width = "0px";
    iframe.style.height = "0px";

    // Wait for the srcdoc document to load before wiring the transport — the
    // contentWindow is only stable/correct after the new document exists.
    iframe.addEventListener(
      "load",
      () => {
        if (token !== mountToken) return; // superseded by a newer mount
        const win = iframe.contentWindow;
        if (!win) {
          log(logEl, "no contentWindow after load");
          return;
        }

        const b = new AppBridge(
          null,
          { name: `${appName}-preview-harness`, version: "1.0.0" },
          { openLinks: {}, logging: {} },
          { hostContext: ctx },
        );

        b.onsizechange = ({ width, height }) => {
          if (width != null) iframe.style.width = `${width}px`;
          if (height != null) iframe.style.height = `${height}px`;
          log(logEl, `size-changed → ${width ?? "?"}×${height ?? "?"}`);
        };
        b.onloggingmessage = ({ level, data }) => {
          log(logEl, `guest ${level}: ${JSON.stringify(data)}`);
        };
        b.oninitialized = () => {
          log(logEl, "view initialized");
          if (pendingResult) b.sendToolResult(pendingResult);
        };

        bridge = b;
        b.connect(new PostMessageTransport(win, win)).catch((err: unknown) => {
          log(logEl, `connect failed: ${String(err)}`);
        });
      },
      { once: true },
    );

    iframe.srcdoc = buildDevHtml(template, devScriptTag);
  }

  mount();

  return {
    get bridge() {
      return bridge as AppBridge;
    },
    sendResult(result) {
      pendingResult = result;
      bridge?.sendToolResult(result);
    },
    remount: mount,
  } as Harness;
}
