import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon, TopEntitiesDto, TopEntityItem } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { statsFilterArgs } from "../schemas/stats";
import { toolResult, noResults } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

const ENTITY_TYPES = ["topics", "people", "companies", "cities", "journalists", "sources"] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

export const topEntitiesArgs = statsFilterArgs.extend({
  entity: z
    .array(z.enum(ENTITY_TYPES))
    .optional()
    .default(["topics", "people", "companies"])
    .describe(
      "Which entity types to return. Options: topics, people, companies, cities, journalists, sources. Defaults to topics, people, and companies."
    ),
});

const TOTAL_KEY: Record<EntityType, keyof TopEntitiesDto> = {
  topics: "totalTopics",
  people: "totalPeople",
  companies: "totalCompanies",
  cities: "totalCities",
  journalists: "totalJournalists",
  sources: "totalSources",
};

export function getTopEntities(perigon: Perigon): ToolCallback {
  return async (args: z.infer<typeof topEntitiesArgs>): Promise<CallToolResult> => {
    try {
      const requested = args.entity ?? ["topics", "people", "companies"];

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
        entity: requested,
      });

      const hasResults = requested.some((t) => {
        const items = result[t] as TopEntityItem[] | undefined;
        return Array.isArray(items) && items.length > 0;
      });
      if (!hasResults) return noResults;

      let output = `<top_entities total_articles="${result.totalArticles ?? 0}">\n`;

      for (const entityType of requested) {
        const items = result[entityType] as TopEntityItem[] | undefined;
        if (!Array.isArray(items) || items.length === 0) continue;
        const total = result[TOTAL_KEY[entityType]] as number | undefined;
        output += `\n<${entityType} total="${total ?? items.length}">\n`;
        output += items
          .map((it, i) => `  <item rank="${i + 1}" key="${it.key}" count="${it.count}" />`)
          .join("\n");
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
