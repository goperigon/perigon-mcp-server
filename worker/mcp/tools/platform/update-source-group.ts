import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

export const updateSourceGroupArgs = z.object({
  id: z.number().int().describe("ID of the source group to update."),
  name: z.string().optional(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  domains: z
    .array(z.string())
    .min(1)
    .max(5000)
    .optional()
    .describe("Replaces the full domain list when provided."),
});

export function updateSourceGroup(
  perigon: Perigon,
): ToolCallback<typeof updateSourceGroupArgs> {
  return async ({
    id,
    ...body
  }: z.infer<typeof updateSourceGroupArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.updateSourceGroup(id, body);
      return toolResult(
        `Updated source group ${result.data.id} ("${result.data.name}") — ${result.data.domains.length} domains.`,
      );
    } catch (error) {
      console.error("Error updating source group:", error);
      return toolResult(
        `Error: Failed to update source group: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const updateSourceGroupTool = {
  name: "update_source_group",
  title: "Update source group",
  description:
    "Partially update a source group. Only provided fields are changed; the domains array is replaced wholesale when provided, not merged. Only use this when the user explicitly asks to modify a source group.",
  parameters: updateSourceGroupArgs,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  createHandler: (perigon: Perigon) => updateSourceGroup(perigon),
} satisfies ToolDefinition<typeof updateSourceGroupArgs>;
