import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  Perigon,
  TopEntitiesDto,
  TopEntityItem,
  TopEntityType,
} from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { statsFilterArgs, statsFilters } from "../schemas/stats";
import { toolResult, noResults } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

const ENTITY_TYPES = [
  "topics",
  "people",
  "companies",
  "cities",
  "journalists",
  "sources",
] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

export const topEntitiesArgs = statsFilterArgs.extend({
  entity: z
    .array(z.enum(ENTITY_TYPES))
    .optional()
    .default(["topics", "people", "companies"])
    .describe(
      "Which entity types to return. Options: topics, people, companies, cities, journalists, sources. Defaults to topics, people, and companies.",
    ),
  size: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .describe(
      "Number of top entries to return per entity type (1–100). Default: 10.",
    ),
  clusterId: z
    .array(z.string())
    .optional()
    .describe(
      "Only count articles in these stories (story IDs from search_news_stories). Use this to break down who and what is covered within a story.",
    ),
});

/** API bucket per tool entity type; journalists are ranked by ID so name variants of one journalist merge. */
const API_ENTITY: Record<EntityType, TopEntityType> = {
  topics: "topics",
  people: "people",
  companies: "companies",
  cities: "cities",
  journalists: "journalistsById",
  sources: "sources",
};

/** Entity types whose keys are IDs, expanded by the API so names can be shown. */
const EXPANDED: ReadonlySet<TopEntityType> = new Set<TopEntityType>([
  "people",
  "companies",
  "journalistsById",
]);

const BUCKET: Record<
  EntityType,
  { items: keyof TopEntitiesDto; total: keyof TopEntitiesDto; keyAttr: string }
> = {
  topics: { items: "topics", total: "totalTopics", keyAttr: "name" },
  people: { items: "people", total: "totalPeople", keyAttr: "wikidata_id" },
  companies: { items: "companies", total: "totalCompanies", keyAttr: "id" },
  cities: { items: "cities", total: "totalCities", keyAttr: "name" },
  journalists: {
    items: "journalistsById",
    total: "totalJournalistsById",
    keyAttr: "id",
  },
  sources: { items: "sources", total: "totalSources", keyAttr: "domain" },
};

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** Names of expanded records, keyed by the bucket key they were looked up by. */
function namesByKey(
  result: TopEntitiesDto,
  entityType: EntityType,
): Map<string, string> {
  const names = new Map<string, string>();
  const add = (key: string, name: string | null | undefined) => {
    if (name) names.set(key, name);
  };
  if (entityType === "people") {
    for (const p of result.topPeople ?? []) add(p.wikidataId, p.name);
  } else if (entityType === "companies") {
    for (const c of result.topCompanies ?? []) add(c.id, c.name);
  } else if (entityType === "journalists") {
    for (const j of result.topJournalists ?? []) add(j.id, j.fullName || j.name);
  }
  return names;
}

export function getTopEntities(
  perigon: Perigon,
): ToolCallback<typeof topEntitiesArgs> {
  return async (
    args: z.infer<typeof topEntitiesArgs>,
  ): Promise<CallToolResult> => {
    try {
      const requested = args.entity ?? ["topics", "people", "companies"];
      const apiEntities = requested.map((t) => API_ENTITY[t]);

      const result: TopEntitiesDto = await perigon.getTopEntities({
        ...statsFilters(args),
        entity: apiEntities,
        expandEntities: apiEntities.filter((t) => EXPANDED.has(t)),
        size: args.size,
        clusterId: args.clusterId,
      });

      const itemsOf = (t: EntityType) =>
        result[BUCKET[t].items] as TopEntityItem[] | undefined;
      const hasResults = requested.some((t) => (itemsOf(t)?.length ?? 0) > 0);
      if (!hasResults) return noResults;

      let output = `<top_entities total_articles="${result.totalArticles ?? 0}">\n`;

      for (const entityType of requested) {
        const items = itemsOf(entityType);
        if (!items || items.length === 0) continue;
        const { total: totalKey, keyAttr } = BUCKET[entityType];
        const total = result[totalKey] as number | undefined;
        const names = namesByKey(result, entityType);
        output += `\n<${entityType} total="${total ?? items.length}">\n`;
        output += items
          .map((it, i) => {
            const name = names.get(it.key);
            const nameAttr =
              keyAttr !== "name" && name ? ` name="${escapeAttr(name)}"` : "";
            return `  <item rank="${i + 1}" ${keyAttr}="${escapeAttr(it.key)}"${nameAttr} count="${it.count}" />`;
          })
          .join("\n");
        output += `\n</${entityType}>\n`;
      }

      output += `</top_entities>`;

      return toolResult(output);
    } catch (error) {
      console.error("Error in get_top_entities:", error);
      return toolResult(
        `Error: Failed to retrieve top entities: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const topEntitiesTool = {
  name: "get_top_entities",
  title: "Top entities",
  description:
    "Get the most frequently mentioned entities in articles matching the given filters, ranked by raw mention count. Use this when the user asks 'what topics/people/companies are most covered?' or 'who appears most in X news?' — i.e., questions about overall mention frequency within a fixed window. Do NOT use this for detecting sudden spikes or trending entities; use get_top_people or get_top_companies for spike detection instead. Defaults to returning topics, people, and companies; use the entity parameter to request other types (cities, journalists, sources). People, companies, and journalists are returned with their ID (wikidata_id for personWikidataId, company id for companyId, journalist id for journalistId filters) and name; topics and cities by name; sources by domain. Counts include passing mentions, not only articles centered on the entity. Supports the same article filters as get_article_counts, plus clusterId.",
  parameters: topEntitiesArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => getTopEntities(perigon),
} satisfies ToolDefinition<typeof topEntitiesArgs>;
