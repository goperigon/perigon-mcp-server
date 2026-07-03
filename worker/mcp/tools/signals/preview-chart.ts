import { z } from "zod";
import { CHART_TOOL_META } from "../../apps/chart-viewer-html";
import { SignalToolDefinition } from "./types";
import { executeCodeSchema } from "./schemas";
import { EXECUTE_CODE_TOOL_NAME, PREVIEW_CHART_TOOL_NAME } from "./common";

// Permissive: the chart JSON is arbitrary (ECharts-derived). We only need
// SOME outputSchema declared so the host forwards structuredContent to the
// widget; the widget does its own shape handling.
const previewChartOutputSchema = z.object({
  charts: z.array(z.record(z.string(), z.unknown())),
});

export const previewChartTool = {
  name: PREVIEW_CHART_TOOL_NAME,
  description:
    "Render a chart to the user. Use this whenever you want to DISPLAY a chart — " +
    "it is the only tool whose output appears in the interactive chart viewer. " +
    `Runs Python in the SAME persistent Jupyter kernel as ${EXECUTE_CODE_TOOL_NAME}, ` +
    "so variables, imports, and DataFrames computed there are available here. " +
    `Do data prep/analysis in ${EXECUTE_CODE_TOOL_NAME}; use this tool only for the plotting code. ` +
    "Call plt.show() after the chart. One plt.show() per chart; for multiple charts call this tool separately. " +
    "No outbound internet access except *.amazonaws.com.",
  parameters: executeCodeSchema,
  outputSchema: previewChartOutputSchema,
  _meta: CHART_TOOL_META,
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("execute_code", args, { chartViewer: true }),
} as const satisfies SignalToolDefinition<typeof executeCodeSchema>;
