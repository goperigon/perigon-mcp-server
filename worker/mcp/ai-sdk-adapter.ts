import { tool } from "ai";
import { z } from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { TOOL_DEFINITIONS, type ToolName } from "./tools";
import { Perigon } from "../lib/perigon";
import { resolveActiveTools } from "./tools/selection";
import { SOCIAL_TOOL_DEFINITIONS, type SocialToolName } from "./tools/social";
import type { ToolDefinition } from "./tools/types";

// Convert MCP CallToolResult to AI SDK tool result (string)
export function convertMCPResult(mcpResult: CallToolResult): string {
  if (mcpResult.content?.[0]?.type === "text") {
    return mcpResult.content[0].text;
  }
  return "No results";
}

/**
 * Builds an AI SDK tool map from the Perigon tool registry.
 *
 * @param apiKey - The Perigon API key used to instantiate the client.
 * @param requestedTools - Optional list of tool names to include. When `null`
 *   or omitted, all tools in the registry are included (existing behavior).
 * @param socialToolNames - Social tools to add, already resolved against the
 *   key's social sources and the request filter.
 */
export function createAISDKTools(
  apiKey: string,
  requestedTools?: string[] | null,
  socialToolNames: readonly SocialToolName[] = []
) {
  const perigon = new Perigon(apiKey);
  const tools: Record<string, any> = {};

  const allToolNames = Object.keys(TOOL_DEFINITIONS) as ToolName[];
  const activeToolNames = resolveActiveTools(allToolNames, requestedTools ?? null);
  const activeDefinitions: [string, ToolDefinition<any>][] = [
    ...activeToolNames.map(
      (name): [string, ToolDefinition<any>] => [name, TOOL_DEFINITIONS[name]]
    ),
    ...socialToolNames.map(
      (name): [string, ToolDefinition<any>] => [
        name,
        SOCIAL_TOOL_DEFINITIONS[name],
      ]
    ),
  ];

  for (const [toolName, definition] of activeDefinitions) {
    tools[toolName] = tool({
      description: definition.description,
      // AI SDK v5 renamed `parameters` to `inputSchema`. The internal MCP tool
      // definition still calls this field `parameters` (zod schema) and we
      // simply rename it at the SDK boundary.
      inputSchema: definition.parameters,
      execute: async (
        params: z.infer<typeof definition.parameters>
      ): Promise<string> => {
        const mcpTool = definition.createHandler(perigon);
        const result: CallToolResult = await mcpTool(params);
        return convertMCPResult(result);
      },
    });
  }

  return tools;
}
