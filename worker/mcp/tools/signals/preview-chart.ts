import { CHART_TOOL_META } from "../../apps/chart-viewer-html";
import { SignalToolDefinition } from "./types";
import { executeCodeSchema } from "./schemas";
import { EXECUTE_CODE_TOOL_NAME, PREVIEW_CHART_TOOL_NAME } from "./common";

export const previewChartTool = {
  name: PREVIEW_CHART_TOOL_NAME,
  description:
    "Display a chart to the user — the only tool whose output appears in the interactive chart viewer. " +
    `Runs in the same kernel as ${EXECUTE_CODE_TOOL_NAME} (its variables are available); do data prep there and only plotting here. ` +
    "End with exactly one plt.show(); call this tool once per chart.",
  parameters: executeCodeSchema,
  _meta: CHART_TOOL_META,
  annotations: {
    title: "Preview Insights chart",
    readOnlyHint: false,
    openWorldHint: true,
    destructiveHint: true,
  },
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("execute_code", args, { chartViewer: true }),
} as const satisfies SignalToolDefinition<typeof executeCodeSchema>;
