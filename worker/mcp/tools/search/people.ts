import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { paginationArgs } from "../schemas/base";
import { createSearchField } from "../schemas/search";
import {
  toolResult,
  noResults,
  createPaginationHeader,
  formatLabel,
  formatLabelList,
  formatWikidataDate,
} from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

/**
 * Schema for people search arguments
 */
export const peopleArgs = z.object({
  ...paginationArgs.shape,
  name: createSearchField("name, description, and aliases"),
  occupation: createSearchField("occupation").describe(
    "Like name, on occupation names (e.g. politician, actor, CEO).",
  ),
  wikidataIds: z
    .array(z.string())
    .optional()
    .describe(
      "Wikidata IDs (e.g. Q76 for Barack Obama).",
    ),
  occupationId: z
    .array(z.string())
    .optional()
    .describe(
      "Wikidata occupation IDs (e.g. Q82955 politician, Q33999 actor).",
    ),
});

/**
 * Search for public figures, politicians, celebrities, and newsworthy individuals
 *
 * This tool helps you find information about notable people including:
 * - Politicians and government officials
 * - Celebrities and public figures
 * - Business leaders and executives
 * - Athletes and sports figures
 * - Academic and scientific figures
 * - Any other newsworthy individuals
 *
 * Search capabilities:
 * - Name-based search with Elasticsearch syntax
 * - Occupation and role filtering
 * - Wikidata ID filtering for precise identification
 * - Biographical information retrieval
 *
 * Returns detailed biographical information including:
 * - Full name and aliases
 * - Occupation and current position
 * - Gender and date of birth
 * - Detailed biographical descriptions
 * - Wikidata identifiers for cross-referencing
 *
 * @param perigon - The Perigon API client instance
 * @returns Tool callback function for MCP
 */
export function searchPeople(
  perigon: Perigon,
): ToolCallback<typeof peopleArgs> {
  return async ({
    page,
    size,
    name,
    occupation,
    wikidataIds,
    occupationId,
  }: z.infer<typeof peopleArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchPeople({
        name,
        page,
        size,
        wikidataId: wikidataIds,
        occupationLabel: occupation,
        occupationId,
      });

      if (result.numResults === 0) return noResults;

      const people = result.results.map((person) => {
        return `<person wikidata_id="${person.wikidataId ?? ""}" name="${person.name ?? ""}">
Aliases: ${person.aliases?.join(", ") || "N/A"}
Occupation: ${formatLabelList(person.occupation)}
Position: ${formatLabelList(person.position)}
Political Party: ${formatLabelList(person.politicalParty)}
Gender: ${formatLabel(person.gender)}
Date Of Birth: ${formatWikidataDate(person.dateOfBirth)}
Date Of Death: ${formatWikidataDate(person.dateOfDeath)}
Image URL: ${person.image?.url ?? "N/A"}
Description: ${person.description ?? "N/A"}
Updated At: ${person.updatedAt ?? "N/A"}
</person>`;
      });

      let output = createPaginationHeader(
        result.numResults,
        page,
        size,
        "people",
      );
      output += "\n<people>\n";
      output += people.join("\n\n");
      output += "\n</people>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching people:", error);
      return toolResult(
        `Error: Failed to search people: ${await createErrorMessage(error)}`,
      );
    }
  };
}

/**
 * Tool definition for people search
 */
export const peopleTool = {
  name: "search_people",
  title: "People",
  description:
    "Search 650k+ public figures (politicians, celebrities, executives, newsworthy people) by name, occupation, or Wikidata ID. Returns name, aliases, occupation, position, political party, gender, birth/death dates, and description. Pass wikidataId to search_news_articles(personWikidataId) rather than personName to avoid name ambiguity.",
  parameters: peopleArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => searchPeople(perigon),
} satisfies ToolDefinition<typeof peopleArgs>;
