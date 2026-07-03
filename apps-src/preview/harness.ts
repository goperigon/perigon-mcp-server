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

/** The width the host commits to for the iframe up front (Claude-like). */
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

    // Model Claude Desktop faithfully: the HOST sizes the iframe WIDTH up
    // front (to the container bounds it advertises) and only grows HEIGHT
    // from what the guest reports. The guest never manages width — its
    // width:100% content just fills the host-given width (this is how
    // PostHog's shipping apps work in Claude). Starting the iframe at width 0
    // would be wrong: the SDK's innerWidth-echo autoResize would report 0 and
    // render flat, which does NOT happen in real Claude.
    const ctx = getHostContext();
    iframe.style.width = `${resolveInitialWidth(ctx.containerDimensions)}px`;
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

        // Height is content-driven (grow from reported height). Width stays
        // host-authoritative (seeded above); the reported width is just the
        // SDK's innerWidth echo of the width we already gave, so applying it
        // is a harmless no-op.
        b.onsizechange = ({ width, height }) => {
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
