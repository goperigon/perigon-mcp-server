export type { SignalToolDefinition } from "./types";

export { createWorkspaceTool } from "./create-workspace";
export { searchSignalsTool } from "./search-signals";
export { readSignalTool } from "./read-signal";
export { exportEventsTool } from "./export-events";
export { executeCodeTool } from "./execute-code";
export { previewChartTool } from "./preview-chart";
export { shellTool } from "./shell";
export { listFilesTool } from "./list-files";
export { grepTool } from "./grep";
export { readFileTool } from "./read-file";
export { writeFileTool } from "./write-file";
export { strReplaceTool } from "./str-replace";

import type { SignalToolDefinition } from "./types";
import { createWorkspaceTool } from "./create-workspace";
import { searchSignalsTool } from "./search-signals";
import { readSignalTool } from "./read-signal";
import { exportEventsTool } from "./export-events";
import { executeCodeTool } from "./execute-code";
import { previewChartTool } from "./preview-chart";
import { shellTool } from "./shell";
import { listFilesTool } from "./list-files";
import { grepTool } from "./grep";
import { readFileTool } from "./read-file";
import { writeFileTool } from "./write-file";
import { strReplaceTool } from "./str-replace";
import z from "zod";

export const SIGNAL_TOOL_DEFINITIONS = {
  [createWorkspaceTool.name]: createWorkspaceTool,
  [searchSignalsTool.name]: searchSignalsTool,
  [readSignalTool.name]: readSignalTool,
  [exportEventsTool.name]: exportEventsTool,
  [executeCodeTool.name]: executeCodeTool,
  [previewChartTool.name]: previewChartTool,
  [shellTool.name]: shellTool,
  [listFilesTool.name]: listFilesTool,
  [grepTool.name]: grepTool,
  [readFileTool.name]: readFileTool,
  [writeFileTool.name]: writeFileTool,
  [strReplaceTool.name]: strReplaceTool,
} as const satisfies Record<string, SignalToolDefinition<any>>;
