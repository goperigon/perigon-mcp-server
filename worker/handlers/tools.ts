import { zodToJsonSchema } from "zod-to-json-schema";
import { HttpError, type SocialSource } from "../types/types";
import { Perigon } from "../lib/perigon";
import { handleError } from "../lib/handle-error";
import { getCachedIntrospection } from "../lib/introspection-cache";
import { DEFAULT_PERIGON_API_URL } from "../lib/mcp-env";
import { validatePerigonAuth } from "../lib/perigon-auth";
import { resolvePerigonApiKey } from "../lib/resolve-perigon-api-key";
import { TOOL_DEFINITIONS } from "../mcp/tools";
import {
  SOCIAL_TOOL_DEFINITIONS,
  SOCIAL_TOOL_NAMES,
  SOCIAL_TOOL_SOURCES,
  type SocialToolName,
} from "../mcp/tools/social";
import type { ToolDefinition } from "../mcp/tools/types";
import { convertMCPResult } from "../mcp/ai-sdk-adapter";

interface ToolInvocationBody {
  tool: string;
  args: unknown;
}

/**
 * GET — list every available tool with its name, description, and JSON-schema
 * arguments. Social tools carry the `socialSource` they need; when the request
 * sends `X-Perigon-API-Key`, `socialSources` reports that key's sources (`null`
 * when unknown) so the playground can lock tools the key cannot use.
 * POST — execute a tool by name with the given args.
 */
export async function handleTools(
  request: Request,
  _env: Env
): Promise<Response> {
  if (request.method === "GET") {
    return listTools(request);
  }

  if (request.method === "POST") {
    return executeTool(request);
  }

  return new Response("Method not allowed", { status: 405 });
}

async function listTools(request: Request): Promise<Response> {
  const newsTools = Object.entries(TOOL_DEFINITIONS).map(([name, def]) => ({
    name,
    description: def.description,
    args: zodToJsonSchema(def.parameters),
  }));
  const socialTools = SOCIAL_TOOL_NAMES.map((name) => {
    const def = SOCIAL_TOOL_DEFINITIONS[name];
    return {
      name,
      description: def.description,
      args: zodToJsonSchema(def.parameters),
      socialSource: SOCIAL_TOOL_SOURCES[name],
    };
  });

  const socialSources = await resolveSocialSources(request);

  return Response.json({
    tools: [...newsTools, ...socialTools],
    socialSources,
  });
}

/** The request key's social sources, or `null` without a key or on failure. */
async function resolveSocialSources(
  request: Request
): Promise<SocialSource[] | null> {
  const apiKey = await resolvePerigonApiKey(request, false);
  if (!apiKey) return null;

  try {
    const introspection = await getCachedIntrospection(
      new Perigon(apiKey),
      apiKey,
      DEFAULT_PERIGON_API_URL
    );
    return introspection.socialSources ?? [];
  } catch (error) {
    console.error("Error introspecting API key for tool list:", error);
    return null;
  }
}

function isSocialToolName(name: string): name is SocialToolName {
  return (SOCIAL_TOOL_NAMES as string[]).includes(name);
}

function findToolDefinition(toolName: string): ToolDefinition | undefined {
  if (isSocialToolName(toolName)) return SOCIAL_TOOL_DEFINITIONS[toolName];
  return TOOL_DEFINITIONS[toolName];
}

async function executeTool(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as ToolInvocationBody;
    const { tool: toolName, args } = body;

    if (!toolName || !args) {
      return new Response("Invalid request", { status: 400 });
    }

    const toolDef = findToolDefinition(toolName);
    if (!toolDef) {
      return new Response("Tool not found", { status: 404 });
    }

    const isAuthenticated = await validatePerigonAuth(request);
    const perigonApiKey = await resolvePerigonApiKey(request, isAuthenticated);

    if (!perigonApiKey) {
      return missingApiKeyResponse(isAuthenticated);
    }

    let validatedArgs: unknown;
    try {
      validatedArgs = toolDef.parameters.parse(args);
    } catch (error) {
      console.error("Validation error for tool", toolName, ":", error);
      return handleError(
        "Invalid Arguments",
        400,
        error instanceof Error ? error.message : String(error)
      );
    }

    const result = await toolDef.createHandler(new Perigon(perigonApiKey))(
      validatedArgs as never
    );

    return Response.json({ result: convertMCPResult(result) });
  } catch (error) {
    if (error instanceof HttpError) {
      return handleError(error.responseBody, error.statusCode, error.message);
    }
    console.error("Error executing tool:", error);
    return handleError(
      "Failed to execute tool",
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}

function missingApiKeyResponse(isAuthenticated: boolean): Response {
  if (!isAuthenticated) {
    return handleError(
      "Authentication required. Please sign in with Perigon or provide a valid API key.",
      401,
      "Authentication required"
    );
  }
  return handleError(
    "No Perigon API key available. Please create an API key in your Perigon dashboard or select one from the dropdown.",
    400,
    "No Perigon API key available"
  );
}
