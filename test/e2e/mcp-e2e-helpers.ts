import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { realFetch } from "../setup";
import type { ToolName } from "../../worker/mcp/tools";

export const E2E_TIMEOUT_MS = 120_000;
export const MCP_PATH = "/v1/mcp";

const SERVER_READY_TIMEOUT_MS = 60_000;
const DEV_VARS_PATH = join(process.cwd(), ".dev.vars");

export const EXPECTED_TOOL_NAMES = [
  "get_article_counts",
  "get_avg_sentiment",
  "get_company_news",
  "get_location_news",
  "get_person_news",
  "get_top_companies",
  "get_top_entities",
  "get_top_people",
  "search_companies",
  "search_journalists",
  "search_news_articles",
  "search_news_stories",
  "search_people",
  "search_sources",
  "search_story_history",
  "search_topics",
  "search_vector_news",
  "search_vector_wikipedia",
  "search_wikipedia",
  "summarize_news",
] as const satisfies readonly ToolName[];

export const apiKey = resolvePerigonApiKey();

export interface DevServer {
  url: (path: string) => string;
  stop: () => Promise<void>;
}

export function sortToolNames(names: readonly string[]): string[] {
  return [...names].sort();
}

export async function listToolNames(
  url: string,
  bearerToken: string
): Promise<string[]> {
  return await withMcpClient(url, bearerToken, async (client) => {
    const { tools } = await client.listTools();
    return sortToolNames(tools.map((tool) => tool.name));
  });
}

export async function callTool(
  url: string,
  bearerToken: string,
  name: ToolName,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  return await withMcpClient(url, bearerToken, async (client) => {
    return (await client.callTool({
      name,
      arguments: args,
    })) as CallToolResult;
  });
}

export function getToolResultText(result: CallToolResult): string {
  const first = result.content?.[0];
  if (!first || first.type !== "text") {
    throw new Error(
      `Expected first content block to be 'text', got '${first?.type ?? "<empty>"}'`
    );
  }
  return first.text;
}

export async function startDevServer(): Promise<DevServer> {
  const [port, inspectorPort] = await Promise.all([getFreePort(), getFreePort()]);
  const logs: string[] = [];

  const child = spawn(
    "pnpm",
    [
      "exec",
      "wrangler",
      "dev",
      "--local",
      "--ip",
      "127.0.0.1",
      "--port",
      String(port),
      "--inspector-port",
      String(inspectorPort),
      "--local-protocol",
      "http",
      "--show-interactive-dev-session",
      "false",
      "--log-level",
      "error",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "sk-ant-test-fake-key",
        PERIGON_API_KEY: apiKey!,
        TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY ?? "test-secret",
        VITE_TURNSTILE_SITE_KEY:
          process.env.VITE_TURNSTILE_SITE_KEY ?? "test-site-key",
        VITE_USE_TURNSTILE: process.env.VITE_USE_TURNSTILE ?? "false",
      },
    }
  );

  collectLogs(child, logs);

  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForServerReady(baseUrl, child, logs);
  } catch (error) {
    await stopProcess(child);
    throw error;
  }

  return {
    url: (path: string) => `${baseUrl}${path}`,
    stop: () => stopProcess(child),
  };
}

async function withMcpClient<T>(
  url: string,
  bearerToken: string,
  run: (client: Client) => Promise<T>
): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    },
    fetch: realFetch,
  });

  const client = new Client({
    name: "perigon-mcp-e2e",
    version: "1.0.0",
  });

  try {
    await client.connect(transport);
    return await run(client);
  } finally {
    await client.close();
  }
}

function resolvePerigonApiKey(): string | undefined {
  const envKey = process.env.PERIGON_API_KEY?.trim();
  if (envKey) return envKey;

  try {
    const devVars = readFileSync(DEV_VARS_PATH, "utf8");
    const match = devVars.match(/^PERIGON_API_KEY=(.*)$/m);
    return match?.[1]?.replace(/^["']|["']$/g, "").trim() || undefined;
  } catch {
    return undefined;
  }
}

function collectLogs(child: ChildProcessWithoutNullStreams, logs: string[]) {
  const collect = (chunk: Buffer) => {
    logs.push(chunk.toString("utf8"));
    if (logs.length > 80) logs.splice(0, logs.length - 80);
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
}

async function waitForServerReady(
  baseUrl: string,
  child: ChildProcessWithoutNullStreams,
  logs: string[]
) {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `wrangler dev exited before becoming ready (code ${child.exitCode}).\n${logs.join("")}`
      );
    }

    try {
      const response = await realFetch(`${baseUrl}${MCP_PATH}`);
      if (response.status === 401 || response.status === 405) {
        await response.body?.cancel();
        return;
      }
      await response.body?.cancel();
    } catch {
      // Keep polling until wrangler binds the port.
    }

    await sleep(500);
  }

  throw new Error(
    `Timed out waiting for wrangler dev at ${baseUrl}.\n${logs.join("")}`
  );
}

async function getFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate a free port")));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

async function stopProcess(
  child: ChildProcessWithoutNullStreams
): Promise<void> {
  if (child.exitCode !== null) return;

  child.kill("SIGTERM");
  const exited = await waitForExit(child, 5_000);
  if (!exited && child.exitCode === null) {
    child.kill("SIGKILL");
    await waitForExit(child, 5_000);
  }
}

async function waitForExit(
  child: ChildProcessWithoutNullStreams,
  timeoutMs: number
): Promise<boolean> {
  return await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    const onExit = () => {
      cleanup();
      resolve(true);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      child.off("exit", onExit);
    };

    child.once("exit", onExit);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
