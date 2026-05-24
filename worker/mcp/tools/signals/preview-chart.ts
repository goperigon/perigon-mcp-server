import { CHART_TOOL_META } from "../../apps/chart-viewer-html";
import { SignalToolDefinition } from "./types";
import { executeCodeSchema } from "./schemas";
import { NAME as EXECUTE_CODE_NAME } from "./execute-code";

export const NAME = "signal_insights_preview_chart";

export const previewChartTool = {
  name: NAME,
  description:
    "Render a chart to the user. Use this whenever you want to DISPLAY a chart — " +
    "it is the only tool whose output appears in the interactive chart viewer. " +
    `Runs Python in the SAME persistent Jupyter kernel as ${EXECUTE_CODE_NAME}, ` +
    "so variables, imports, and DataFrames computed there are available here. " +
    `Do data prep/analysis in ${EXECUTE_CODE_NAME}; use this tool only for the plotting code. ` +
    "Call plt.show() after the chart. One plt.show() per chart; for multiple charts call this tool separately. " +
    "No outbound internet access except *.amazonaws.com.",
  parameters: executeCodeSchema,
  _meta: CHART_TOOL_META,
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("execute_code", args, { chartViewer: true }),
} as const satisfies SignalToolDefinition<typeof executeCodeSchema>;
