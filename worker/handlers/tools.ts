import { zodToJsonSchema } from "zod-to-json-schema";
import { HttpError } from "../types/types";
import { Perigon } from "../lib/perigon";
import { handleError } from "../lib/handle-error";
import { validatePerigonAuth } from "../lib/perigon-auth";
import { resolvePerigonApiKey } from "../lib/resolve-perigon-api-key";
import { TOOL_DEFINITIONS } from "../mcp/tools";
import { convertMCPResult } from "../mcp/ai-sdk-adapter";

interface ToolInvocationBody {
  tool: string;
  args: unknown;
}

/**
 * GET — list every available tool with its name, description, and JSON-schema
 * arguments. POST — execute a tool by name with the given args.
 */
export async function handleTools(
  request: Request,
  _env: Env
): Promise<Response> {
  if (request.method === "GET") {
    return listTools();
  }

  if (request.method === "POST") {
    return executeTool(request);
  }

  return new Response("Method not allowed", { status: 405 });
}

function listTools(): Response {
  const tools = Object.entries(TOOL_DEFINITIONS).map(([name, def]) => ({
    name,
    description: def.description,
    args: zodToJsonSchema(def.parameters),
  }));

  return Response.json({ tools });
}

async function executeTool(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as ToolInvocationBody;
    const { tool: toolName, args } = body;

    if (!toolName || !args) {
      return new Response("Invalid request", { status: 400 });
    }

    const toolDef = TOOL_DEFINITIONS[toolName];
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
