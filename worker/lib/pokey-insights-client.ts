import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { HttpError } from "../types/types";
import { previewChartTool } from "../mcp/tools/signals/preview-chart";

interface ExecuteCodeDisplayResult {
  text?: string | null;
}

interface ChartOutput {
  chart?: unknown;
  png?: string | null;
  text?: string | null;
}

interface ExecuteCodeResult {
  stdout?: string;
  stderr?: string;
  error?: string | null;
  results?: ExecuteCodeDisplayResult[];
  _charts?: ChartOutput[];
}

interface ExportEventsResult {
  name?: string;
  columns: string[];
  rowCount: number;
  preview: Record<string, unknown>[];
  s3File: string | null;
  error?: string;
}

/**
 * Converts a Pokey execute_code JSON response into an MCP tool result.
 *
 * Both signal_insights_execute_code and signal_insights_preview_chart run code
 * through the same Pokey execute_code endpoint; the `chartViewer` flag decides
 * how charts are surfaced:
 *
 * - chartViewer=true (preview_chart): drives the MCP Apps chart viewer.
 *   structuredContent.charts holds the full chart data (JSON + PNG) read by the
 *   viewer iframe (SEP-1865) from the ui/notifications/tool-result notification,
 *   and a PNG ImageContent fallback is included for non-Apps clients (Cursor etc.).
 * - chartViewer=false (execute_code): no chart UI. Any charts produced are
 *   dropped and replaced with a note nudging the model to re-run the plotting
 *   code via signal_insights_preview_chart to actually display them.
 *
 * In both cases content text blocks (stdout/stderr/error/IPython text) are
 * returned for the model to read.
 */
function buildExecuteCodeResult(
  data: ExecuteCodeResult,
  { chartViewer }: { chartViewer: boolean },
): CallToolResult {
  const content: CallToolResult["content"] = [];
  const textParts: string[] = [];

  if (data.stdout) textParts.push(`[stdout]\n${data.stdout}`);
  if (data.stderr) textParts.push(`[stderr]\n${data.stderr}`);
  if (data.error) textParts.push(`[error]\n${data.error}`);

  for (const r of data.results ?? []) {
    if (r.text) textParts.push(r.text);
  }

  const chartCount = data._charts?.length ?? 0;

  if (!chartViewer && chartCount > 0) {
    textParts.push(
      `[charts] ${chartCount} chart(s) were generated but are NOT shown to the user. ` +
        `To display a chart, call ${previewChartTool.name} with the plotting code.`,
    );
  }

  if (textParts.length > 0) {
    content.push({ type: "text", text: textParts.join("\n\n").trim() });
  }

  // PNG fallback for non-Apps MCP clients (audience: user, not model context).
  // Only the chart viewer tool surfaces chart images.
  if (chartViewer) {
    for (const chart of data._charts ?? []) {
      if (chart.png) {
        content.push({
          type: "image",
          data: chart.png,
          mimeType: "image/png",
          annotations: { audience: ["user"] },
        });
      }
    }
  }

  if (content.length === 0) {
    content.push({ type: "text", text: "(no output)" });
  }

  // structuredContent.charts is read by the MCP Apps chart viewer iframe.
  // It is also included in model context, so the model can narrate chart types.
  const structuredContent =
    chartViewer && chartCount > 0 ? { charts: data._charts } : undefined;

  return {
    content,
    structuredContent,
    isError: !!data.error,
  };
}

function buildExportEventsResult(data: ExportEventsResult): CallToolResult {
  const content: CallToolResult["content"] = [];
  const textParts: string[] = [];

  if (data.error) textParts.push(`[error]\n${data.error}`);

  if (data.name) textParts.push(`Export: ${data.name}`);

  textParts.push(
    `Exported ${data.rowCount} rows with columns: ${data.columns.join(", ")}`,
  );

  if (data.s3File) textParts.push(`S3 file: ${data.s3File}`);

  if (data.preview.length > 0) {
    textParts.push(
      `Preview (first ${data.preview.length} rows):\n${JSON.stringify(data.preview, null, 2)}`,
    );
  }

  content.push({ type: "text", text: textParts.join("\n\n").trim() });

  const structuredContent = {
    export: {
      name: data.name,
      columns: data.columns,
      preview: data.preview,
      rowCount: data.rowCount,
      s3File: data.s3File,
    },
  };

  return {
    content,
    structuredContent,
    isError: !!data.error,
  };
}

/**
 * HTTP client for Signal Insights stateful tool execution on Pokey.
 * All stateful tools (E2B sandbox, S3 artifacts, export) run in Pokey since
 * those services cannot be hosted in the public Cloudflare Worker.
 */
export class PokeyInsightsClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly timeoutMs: number = 60_000,
  ) {}

  private get headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Creates a new workspace in Pokey. Pokey mints a UUID and writes an S3
   * directory marker so the workspace can be validated on subsequent calls.
   */
  async createWorkspace(): Promise<CallToolResult> {
    const res = await fetch(
      `${this.baseUrl}/v1/signal-insights/mcp/workspaces`,
      {
        method: "POST",
        headers: this.headers,
        signal: AbortSignal.timeout(this.timeoutMs),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new HttpError(
        res.status,
        body,
        `Failed to create workspace: ${body}`,
      );
    }

    const { workspace } = (await res.json()) as { workspace: string };
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ workspace }),
        },
      ],
    };
  }

  /**
   * Executes a stateful tool in Pokey. The `workspace` field in `args` scopes
   * the E2B sandbox and S3 artifacts for this call.
   */
  async executeTool(
    toolName: string,
    args: unknown,
    opts?: { chartViewer?: boolean },
  ): Promise<CallToolResult> {
    const res = await fetch(
      `${this.baseUrl}/v1/signal-insights/mcp/tools/${toolName}`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(this.timeoutMs),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      let errorMessage: string;
      try {
        const parsed = JSON.parse(body) as { error?: string };
        errorMessage = parsed.error ?? body;
      } catch {
        errorMessage = body;
      }
      return {
        content: [{ type: "text", text: errorMessage }],
        isError: true,
      };
    }

    const result = await res.json();

    if (toolName === "execute_code") {
      return buildExecuteCodeResult(result as ExecuteCodeResult, {
        chartViewer: opts?.chartViewer ?? false,
      });
    }

    if (toolName === "export_events") {
      return buildExportEventsResult(result as ExportEventsResult);
    }

    return {
      content: [
        {
          type: "text",
          text:
            typeof result === "string"
              ? result
              : JSON.stringify(result, null, 2),
        },
      ],
    };
  }
}
