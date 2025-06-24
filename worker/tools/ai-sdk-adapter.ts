import { tool } from "ai";
import { Configuration, V1Api } from "@goperigon/perigon-ts";
import { z } from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { TOOL_DEFINITIONS } from "../mcp/tools";

// Convert MCP CallToolResult to AI SDK tool result (string)
function convertMCPResult(mcpResult: CallToolResult): string {
  if (mcpResult.content?.[0]?.type === "text") {
    return mcpResult.content[0].text;
  }
  return "No results";
}

export function createAISDKTools(apiKey: string) {
  const perigon = new V1Api(new Configuration({ apiKey }));

  const tools: Record<string, any> = {};

  for (const [toolName, definition] of Object.entries(TOOL_DEFINITIONS)) {
    tools[toolName] = tool({
      description: definition.description,
      parameters: definition.parameters,
      execute: async (
        params: z.infer<typeof definition.parameters>,
      ): Promise<string> => {
        const mcpTool = definition.createHandler(perigon);
        const result: CallToolResult = await mcpTool(params);
        return convertMCPResult(result);
      },
    });
  }

  return tools;
}
