import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { HttpError } from "../types/types";

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

/**
 * Converts a Pokey execute_code JSON response into MCP content blocks.
 * - stdout/stderr/error/IPython text → single text block (model sees this)
 * - _charts[].png → ImageContent with audience:["user"] (user-visible only,
 *   excluded from model context per MCP annotation spec)
 */
function buildExecuteCodeResult(data: ExecuteCodeResult): CallToolResult {
  const content: CallToolResult["content"] = [];
  const textParts: string[] = [];

  if (data.stdout) textParts.push(`[stdout]\n${data.stdout}`);
  if (data.stderr) textParts.push(`[stderr]\n${data.stderr}`);
  if (data.error) textParts.push(`[error]\n${data.error}`);

  for (const r of data.results ?? []) {
    if (r.text) textParts.push(r.text);
  }

  if (textParts.length > 0) {
    content.push({ type: "text", text: textParts.join("\n\n").trim() });
  }

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

  if (content.length === 0) {
    content.push({ type: "text", text: "(no output)" });
  }

  return { content, isError: !!data.error };
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
  ) {}

  private headers(): HeadersInit {
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
      { method: "POST", headers: this.headers() },
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
  async executeTool(toolName: string, args: unknown): Promise<CallToolResult> {
    const res = await fetch(
      `${this.baseUrl}/v1/signal-insights/mcp/tools/${toolName}`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(args),
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
      return buildExecuteCodeResult(result as ExecuteCodeResult);
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
