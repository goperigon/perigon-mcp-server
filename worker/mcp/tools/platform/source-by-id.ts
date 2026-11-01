import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

export const sourceByIdArgs = z.object({
  id: z.string().describe("Exact source ID or domain returned by search_sources."),
});

export function getSourceById(
  perigon: Perigon,
): ToolCallback<typeof sourceByIdArgs> {
  return async ({
    id,
  }: z.infer<typeof sourceByIdArgs>): Promise<CallToolResult> => {
    try {
      const source = await perigon.getSourceById(id);
      const output = `<source name="${source.name ?? ""}" domain="${source.domain ?? ""}">
Description: ${source.description ?? "N/A"}
Monthly Visits: ${source.monthlyVisits ?? "N/A"}
Global Rank: ${source.globalRank ?? "N/A"}
Avg Monthly Posts: ${source.avgMonthlyPosts ?? "N/A"}
Paywall: ${source.paywall ?? "N/A"}
Alt Names: ${source.altNames?.join(", ") || "N/A"}
Location: ${
        source.location
          ? [source.location.city, source.location.state, source.location.country]
              .filter(Boolean)
              .join(", ")
          : "N/A"
      }
Top Topics: ${source.topTopics?.map((t) => t.name).join(", ") || "N/A"}
</source>`;
      return toolResult(output);
    } catch (error) {
      console.error("Error fetching source by ID:", error);
      return toolResult(
        `Error: Failed to fetch source by ID: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const sourceByIdTool = {
  name: "get_source_by_id",
  title: "Get source by ID",
  description:
    "Look up one news source/publisher by its exact ID or domain. Use this after search_sources or search_news_articles surfaces a source you want full detail on — `id` is @InternalParameter on search_sources, so this endpoint is the only route to a single source's paywall status, alt names, and location.",
  parameters: sourceByIdArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  createHandler: (perigon: Perigon) => getSourceById(perigon),
} satisfies ToolDefinition<typeof sourceByIdArgs>;
