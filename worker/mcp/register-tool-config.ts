/**
 * Config passed to `McpServer.registerTool`. Centralized so unit tests can
 * assert the same metadata that `tools/list` exposes to MCP hosts.
 */
import type { z } from "zod";
import type { SignalToolDefinition } from "./tools/signals/types";
import type { ToolAnnotations, ToolDefinition } from "./tools/types";

/** MCP tool parameter schemas are always Zod objects with a string-keyed shape. */
export type ToolInputSchema = z.ZodObject<z.ZodRawShape>;

export type McpRegisterToolConfig = {
  title: string | undefined;
  description: string;
  inputSchema: ToolInputSchema;
  annotations?: ToolAnnotations;
  _meta?: Record<string, unknown>;
};

export function buildNewsToolRegisterConfig(
  definition: ToolDefinition,
  description: string,
): McpRegisterToolConfig {
  return {
    title: definition.title,
    description,
    inputSchema: definition.parameters,
    annotations: {
      title: definition.title,
      ...definition.annotations,
    },
  };
}

export function buildSignalToolRegisterConfig<T extends ToolInputSchema>(
  def: SignalToolDefinition<T>,
): McpRegisterToolConfig {
  return {
    title: def.annotations.title,
    description: def.description,
    inputSchema: def.parameters,
    annotations: def.annotations,
    _meta: def._meta,
  };
}
