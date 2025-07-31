import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../lib/perigon";

/**
 * Callback function type for MCP tools
 */
export type ToolCallback = (args: any) => Promise<CallToolResult>;

/**
 * Tool definition interface for MCP tools
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  createHandler: (perigon: Perigon) => ToolCallback;
}

/**
 * Constants used across tools
 */
export const CONSTANTS = {
  DEFAULT_COUNTRIES: ["us"],
  DEFAULT_PAGE_SIZE: 10,
} as const;