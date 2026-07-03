import EXPORT_TEMPLATE from "../../worker/mcp/ui/export-viewer.template.html?raw";
import { createHarness, readContainerDimensions } from "./harness";
import { MOCK_EXPORTS } from "./mock-export";

const iframe = document.querySelector("#viewer") as HTMLIFrameElement;
const logEl = document.querySelector("#log") as HTMLElement;
const widthMode = document.querySelector("#width-mode") as unknown as HTMLSelectElement;
const widthValue = document.querySelector("#width-value") as HTMLInputElement;
const remountBtn = document.querySelector("#remount") as HTMLElement;

function hostContext() {
  return {
    containerDimensions: readContainerDimensions(widthMode, widthValue),
  };
}

const harness = createHarness(
  {
    iframe,
    template: EXPORT_TEMPLATE,
    devScriptTag: '<script type="module" src="/export-viewer/main.ts"></script>',
    appName: "export-viewer",
    logEl,
  },
  hostContext,
);

function sendExport(key: string) {
  if (key === "__none__") {
    harness.sendResult({ content: [{ type: "text", text: "No export" }] });
    return;
  }
  const data = MOCK_EXPORTS[key];
  harness.sendResult({
    content: [{ type: "text", text: `Exported ${data.rowCount} rows` }],
    structuredContent: { export: data },
  });
}

document.querySelectorAll<HTMLButtonElement>(".controls button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".controls button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    sendExport(btn.dataset.export!);
  });
});

remountBtn.addEventListener("click", () => harness.remount());
[widthMode, widthValue].forEach((el) => el.addEventListener("change", () => harness.remount()));
