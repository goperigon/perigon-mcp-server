import { tool } from "ai";
import { z } from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { TOOL_DEFINITIONS } from "./tools";
import { Perigon } from "../lib/perigon";

// Convert MCP CallToolResult to AI SDK tool result (string)
export function convertMCPResult(mcpResult: CallToolResult): string {
  if (mcpResult.content?.[0]?.type === "text") {
    return mcpResult.content[0].text;
  }
  return "No results";
}

export function createAISDKTools(apiKey: string) {
  const perigon = new Perigon(apiKey);

  const tools: Record<string, any> = {};

  for (const [toolName, definition] of Object.entries(TOOL_DEFINITIONS)) {
    tools[toolName] = tool({
      description: definition.description,
      parameters: definition.parameters,
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
