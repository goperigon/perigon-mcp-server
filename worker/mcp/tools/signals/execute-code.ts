import { WORKSPACE_DIR, DATA_DIR, OUTPUT_DIR } from "../../constants";
import { SignalToolDefinition } from "./types";
import { executeCodeSchema } from "./schemas";
import { EXECUTE_CODE_TOOL_NAME, PREVIEW_CHART_TOOL_NAME } from "./common";

export const executeCodeTool = {
  name: EXECUTE_CODE_TOOL_NAME,
  description:
    "Run Python in a persistent Jupyter kernel; variables, imports, and DataFrames persist between calls. " +
    `Working directory: ${WORKSPACE_DIR}. ` +
    `DATA (${DATA_DIR}): S3-backed, persists across restarts; export files land here; keep intermediate files here. ` +
    `OUTPUT (${OUTPUT_DIR}): user-facing deliverables (charts, reports, CSVs), shown in the user's Artifacts panel. ` +
    "Pre-installed: pandas, numpy, matplotlib, seaborn, scipy, scikit-learn, statsmodels, polars, pyarrow, openpyxl, xgboost, lightgbm, nltk, and more. " +
    `Charts shown here are NOT displayed to the user; use ${PREVIEW_CHART_TOOL_NAME} for that. ` +
    "Before groupby/value_counts/top-N, drop rows with a missing label — null categories often dominate and mislead. " +
    "No internet except *.amazonaws.com.",
  parameters: executeCodeSchema,
  annotations: {
    title: "Run Insights code",
    readOnlyHint: false,
    openWorldHint: true,
    destructiveHint: true,
  },
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("execute_code", args),
} as const satisfies SignalToolDefinition<typeof executeCodeSchema>;
