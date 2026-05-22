import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../lib/perigon";

/**
 * Callback function type for MCP tools
 */
export type ToolCallback<T extends z.ZodObject<any>> = (
  args: z.infer<T>,
) => Promise<CallToolResult>;

/**
 * Tool definition interface for MCP tools
 */
export interface ToolDefinition<T extends z.ZodObject<any>> {
  name: string;
  description: string;
  parameters: T;
  createHandler: (perigon: Perigon) => ToolCallback<T>;
}

/**
 * Constants used across tools
 */
export const CONSTANTS = {
  DEFAULT_COUNTRIES: ["us"],
  DEFAULT_PAGE_SIZE: 10,
} as const;
