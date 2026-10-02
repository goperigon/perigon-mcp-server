import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { formatNewsletterMarkdown } from "./format-newsletter";

import { DEFAULT_PERIGON_API_URL } from "./perigon";

const INSIGHTS_MCP_PATH = "/v1/signal/insights/mcp";

/**
 * Thin HTTP client for the Signal Insights read-only endpoints on
 * api.perigon.io (authenticated by Perigon API key).
 *
 * These endpoints are served by the InsightsController (MCP alias) in the
 * business-api-server and require the SIGNAL_INSIGHTS permission scope.
 */
export class InsightsApiClient {
  private readonly baseUrl: string;

  constructor(
    private readonly apiKey: string,
    private readonly timeoutMs: number = 60_000,
    apiUrl: string = DEFAULT_PERIGON_API_URL,
    private readonly sharedSecret?: string,
  ) {
    this.baseUrl = `${apiUrl.replace(/\/+$/, "")}${INSIGHTS_MCP_PATH}`;
  }

  private get headers(): HeadersInit {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (this.sharedSecret) {
      headers["x-perigon-shared-secret"] = this.sharedSecret;
    }
    return headers;
  }

  async searchSignals(args: {
    query?: string;
    page?: number;
    limit?: number;
    classificationTypes?: Array<"EVENT" | "MENTIONS" | "TOPIC">;
  }): Promise<CallToolResult> {
    const url = new URL(`${this.baseUrl}/search`);
    if (args.query) url.searchParams.set("query", args.query);
    if (args.page !== undefined)
      url.searchParams.set("page", String(args.page));
    if (args.limit !== undefined)
      url.searchParams.set("limit", String(args.limit));
    if (args.classificationTypes) {
      for (const t of args.classificationTypes) {
        url.searchParams.append("classificationTypes", t);
      }
    }

    const res = await fetch(url.toString(), {
      headers: this.headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      const body = await res.text();
      return {
        content: [
          {
            type: "text",
            text: `Signal search failed (${res.status}): ${body}`,
          },
        ],
        isError: true,
      };
    }

    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  async readSignal(signalUuid: string): Promise<CallToolResult> {
    const res = await fetch(`${this.baseUrl}/${signalUuid}/metadata`, {
      headers: this.headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      const body = await res.text();
      return {
        content: [
          { type: "text", text: `Read signal failed (${res.status}): ${body}` },
        ],
        isError: true,
      };
    }

    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  async listNewsletters(args: {
    signalUuid: string;
    page?: number;
    limit?: number;
  }): Promise<CallToolResult> {
    const url = new URL(`${this.baseUrl}/${args.signalUuid}/newsletters`);
    if (args.page !== undefined)
      url.searchParams.set("page", String(args.page));
    if (args.limit !== undefined)
      url.searchParams.set("limit", String(args.limit));

    const res = await fetch(url.toString(), {
      headers: this.headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      const body = await res.text();
      return {
        content: [
          {
            type: "text",
            text: `List newsletters failed (${res.status}): ${body}`,
          },
        ],
        isError: true,
      };
    }

    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  async readNewsletter(newsletterUuid: string): Promise<CallToolResult> {
    const res = await fetch(`${this.baseUrl}/newsletters/${newsletterUuid}`, {
      headers: this.headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      const body = await res.text();
      return {
        content: [
          {
            type: "text",
            text: `Read newsletter failed (${res.status}): ${body}`,
          },
        ],
        isError: true,
      };
    }

    const envelope = (await res.json()) as {
      data?: {
        uuid: string;
        signalUuid: string;
        signalName: string;
        title: string;
        content: string;
        createdAt: string;
        updatedAt: string;
      };
    };
    const newsletter = envelope.data;
    if (!newsletter) {
      return {
        content: [{ type: "text", text: "Read newsletter failed: empty body" }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: formatNewsletterMarkdown(newsletter) }],
    };
  }
}
