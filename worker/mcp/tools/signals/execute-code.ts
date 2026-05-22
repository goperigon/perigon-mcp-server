import { WORKSPACE_DIR, DATA_DIR, OUTPUT_DIR } from "../../constants";
import { CHART_TOOL_META } from "../../apps/chart-viewer-html";
import { SignalToolDefinition } from "./types";
import { executeCodeSchema } from "./schemas";

const NAME = "signal_insights_execute_code" as const;

export const executeCodeTool = {
  name: NAME,
  description:
    "Execute Python code inside a persistent sandboxed Jupyter kernel (IPython). " +
    "State is fully preserved between calls: variables, imports, DataFrames, fitted models, and function definitions all remain in memory. " +
    `WORKSPACE (${WORKSPACE_DIR}): default working directory. Use this to create any files you need. ` +
    `DATA (${DATA_DIR}): S3-backed read-write directory. Query result files appear here automatically. This directory persists across sandbox restarts. ` +
    `OUTPUT (${OUTPUT_DIR}): write user-facing deliverables here (charts, reports, CSVs, exports). Files in output/ appear in the user's Artifacts panel and are downloadable. Internal/intermediate files should stay in DATA root. ` +
    "Pre-installed highlights: pandas, numpy, matplotlib, seaborn, scipy, scikit-learn, statsmodels, pyarrow, polars, openpyxl, sqlalchemy, beautifulsoup4, nltk, xgboost, lightgbm, shap, pillow, sympy, tabulate, rich. " +
    `CHARTS: Call plt.show() after any matplotlib chart — the chart is rendered interactively in the UI. One plt.show() per chart; for multiple charts call ${NAME} separately. ` +
    "No outbound internet access except *.amazonaws.com.",
  parameters: executeCodeSchema,
  _meta: CHART_TOOL_META,
  createHandler: (_insightsApi, pokeyClient) => async (args) =>
    pokeyClient.executeTool("execute_code", args),
} as const satisfies SignalToolDefinition<typeof executeCodeSchema>;
