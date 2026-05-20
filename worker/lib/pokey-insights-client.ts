import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { HttpError } from "../types/types";

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
      throw new HttpError(res.status, body, `Failed to create workspace: ${body}`);
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
    return {
      content: [
        {
          type: "text",
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  }
}
