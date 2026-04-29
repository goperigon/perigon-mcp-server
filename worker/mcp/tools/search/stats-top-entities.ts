import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon, TopEntitiesDto } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { statsFilterArgs } from "../schemas/stats";
import { toolResult, noResults } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

export const topEntitiesArgs = statsFilterArgs.extend({
  entity: z
    .array(
      z.enum(["topics", "people", "companies", "cities", "journalists", "sources"])
    )
    .optional()
    .default(["topics", "people", "companies"])
    .describe(
      "Which entity types to return. Options: topics, people, companies, cities, journalists, sources. Defaults to topics, people, and companies."
    ),
});

export function getTopEntities(perigon: Perigon): ToolCallback {
  return async (args: z.infer<typeof topEntitiesArgs>): Promise<CallToolResult> => {
    try {
      const result: TopEntitiesDto = await perigon.getTopEntities({
        q: args.q,
        from: args.from,
        to: args.to,
        source: args.source,
        sourceGroup: args.sourceGroup,
        category: args.category,
        topic: args.topic,
        language: args.language,
        country: args.country,
        personName: args.personName,
        companyDomain: args.companyDomain,
        companySymbol: args.companySymbol,
        entity: args.entity,
      });

      const hasResults = Object.values(result).some(
        (v) => Array.isArray(v) && v.length > 0
      );
      if (!hasResults) return noResults;

      let output = `<top_entities>\n`;

      for (const entityType of (args.entity ?? ["topics", "people", "companies"])) {
        const items = result[entityType];
        if (!Array.isArray(items) || items.length === 0) continue;
        output += `\n<${entityType}>\n`;
        output += JSON.stringify(items, null, 2);
        output += `\n</${entityType}>\n`;
      }

      output += `</top_entities>`;

      return toolResult(output);
    } catch (error) {
      console.error("Error in get_top_entities:", error);
      return toolResult(
        `Error: Failed to retrieve top entities: ${await createErrorMessage(error)}`
      );
    }
  };
}

export const topEntitiesTool: ToolDefinition = {
  name: "get_top_entities",
  description:
    "Get the most frequently mentioned entities in articles matching the given filters, ranked by raw mention count. Use this when the user asks 'what topics/people/companies are most covered?' or 'who appears most in X news?' — i.e., questions about overall mention frequency within a fixed window. Do NOT use this for detecting sudden spikes or trending entities; use get_top_people or get_top_companies for spike detection instead. Defaults to returning topics, people, and companies; use the entity parameter to request other types (cities, journalists, sources). Supports the same article filters as search_news_articles.",
  parameters: topEntitiesArgs,
  createHandler: (perigon: Perigon) => getTopEntities(perigon),
};
