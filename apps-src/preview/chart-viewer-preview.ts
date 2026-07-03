import CHART_TEMPLATE from "../../worker/mcp/ui/chart-viewer.template.html?raw";
import { createHarness, readContainerDimensions } from "./harness";
import { MOCK_CHARTS } from "./mock-charts";

const iframe = document.querySelector("#viewer") as HTMLIFrameElement;
const logEl = document.querySelector("#log") as HTMLElement;
const widthMode = document.querySelector("#width-mode") as unknown as HTMLSelectElement;
const widthValue = document.querySelector("#width-value") as HTMLInputElement;
const themeDark = document.querySelector("#theme-dark") as HTMLInputElement;
const remountBtn = document.querySelector("#remount") as HTMLElement;

function hostContext() {
  return {
    theme: themeDark.checked ? ("dark" as const) : ("light" as const),
    containerDimensions: readContainerDimensions(widthMode, widthValue),
  };
}

const harness = createHarness(
  {
    iframe,
    template: CHART_TEMPLATE,
    devScriptTag: '<script type="module" src="/chart-viewer/main.ts"></script>',
    appName: "chart-viewer",
    logEl,
  },
  hostContext,
);

function sendChart(type: string) {
  if (type === "__empty__") {
    harness.sendResult({ content: [{ type: "text", text: "No charts" }] });
    return;
  }
  const chart = MOCK_CHARTS[type];
  harness.sendResult({
    content: [{ type: "text", text: `Rendered ${type} chart` }],
    structuredContent: { charts: [{ chart, png: null }] },
  });
}

document.querySelectorAll<HTMLButtonElement>(".controls button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".controls button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    sendChart(btn.dataset.chart!);
  });
});

remountBtn.addEventListener("click", () => harness.remount());
[widthMode, widthValue, themeDark].forEach((el) =>
  el.addEventListener("change", () => harness.remount()),
);
