import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { SourceGroupDto } from "../../../types/platform";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult, noResults, createPaginationHeader } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

export const sourceGroupsArgs = z.object({
  id: z.number().int().optional().describe("Get one source group by exact numeric ID."),
  resolveNames: z
    .array(z.string())
    .max(100)
    .optional()
    .describe(
      "Resolve source groups by exact name — returns the org's private group if one exists, else the matching public group.",
    ),
  nameContains: z.string().optional().describe("List mode: filter by name."),
  domainContains: z.string().optional().describe("List mode: filter by a domain in the group."),
  page: z.number().min(0).default(0),
  size: z.number().min(1).max(100).default(10),
  sortBy: z.enum(["id", "createdAt", "updatedAt", "name"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

function formatSourceGroup(g: SourceGroupDto): string {
  return `<source_group id="${g.id}" name="${g.name}">
Display Name: ${g.displayName}
Description: ${g.description ?? "N/A"}
Visible: ${g.visible}
Domains: ${g.domains.join(", ")}
</source_group>`;
}

export function getSourceGroups(
  perigon: Perigon,
): ToolCallback<typeof sourceGroupsArgs> {
  return async ({
    id,
    resolveNames,
    nameContains,
    domainContains,
    page,
    size,
    sortBy,
    sortOrder,
  }: z.infer<typeof sourceGroupsArgs>): Promise<CallToolResult> => {
    try {
      if (id !== undefined) {
        const result = await perigon.getSourceGroup(id);
        return toolResult(formatSourceGroup(result.data));
      }

      if (resolveNames && resolveNames.length > 0) {
        const result = await perigon.resolveSourceGroups(resolveNames);
        if (!result.data || result.data.length === 0) return noResults;
        return toolResult(
          `<source_groups>\n${result.data.map(formatSourceGroup).join("\n\n")}\n</source_groups>`,
        );
      }

      const result = await perigon.listSourceGroups({
        name: nameContains,
        domain: domainContains,
        page,
        size,
        sortBy,
        sortOrder,
      });
      if (result.total === 0) return noResults;
      let output = createPaginationHeader(result.total, page, size, "source groups");
      output += `\n<source_groups>\n${result.data.map(formatSourceGroup).join("\n\n")}\n</source_groups>`;
      return toolResult(output);
    } catch (error) {
      console.error("Error fetching source groups:", error);
      return toolResult(
        `Error: Failed to fetch source groups: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const sourceGroupsTool = {
  name: "source_groups",
  title: "List, get, or resolve source groups",
  description:
    "List, get by ID, or resolve by exact name the organization's custom source groups (curated domain bundles usable via the sourceGroup filter, alongside built-ins like top10/top100). Pass id for a single lookup, resolveNames to look up by exact name, or neither to list/search.",
  parameters: sourceGroupsArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  createHandler: (perigon: Perigon) => getSourceGroups(perigon),
} satisfies ToolDefinition<typeof sourceGroupsArgs>;
