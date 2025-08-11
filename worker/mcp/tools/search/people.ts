import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { paginationArgs } from "../schemas/base";
import { createSearchField } from "../schemas/search";
import { toolResult, noResults, createPaginationHeader } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

/**
 * Schema for people search arguments
 */
export const peopleArgs = z.object({
  ...paginationArgs.shape,
  name: createSearchField("person's name"),
  occupation: createSearchField(
    "occupation names (e.g., politician, actor, CEO, athlete)"
  ),
  wikidataIds: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by Wikidata entity IDs (e.g., Q7747, Q937). These are unique identifiers from Wikidata.org that precisely identify public figures and eliminate name ambiguity. Multiple values create an OR filter."
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
export function searchPeople(perigon: Perigon): ToolCallback {
  return async ({
    page,
    size,
    name,
    occupation,
    wikidataIds,
  }: z.infer<typeof peopleArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchPeople({
        name: name,
        page,
        size,
        wikidataId: wikidataIds,
        occupationLabel: occupation,
      });

      if (result.numResults === 0) return noResults;

      const people = result.results.map((person) => {
        return `<person name="${person.name}">
Occupation: ${person.occupation}
Position: ${person.position}
Gender: ${person.gender}
Date Of Birth: ${person.dateOfBirth}
Description: ${person.description}
</person>`;
      });

      let output = createPaginationHeader(
        result.numResults,
        page,
        size,
        "people"
      );
      output += "\n<people>\n";
      output += people.join("\n\n");
      output += "\n</people>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching people:", error);
      return toolResult(
        `Error: Failed to search people: ${await createErrorMessage(error)}`
      );
    }
  };
}

/**
 * Tool definition for people search
 */
export const peopleTool: ToolDefinition = {
  name: "search_people",
  description:
    "Search for public figures, politicians, celebrities, and newsworthy individuals. Returns biographical information including occupation, position, and detailed descriptions.",
  parameters: peopleArgs,
  createHandler: (perigon: Perigon) => searchPeople(perigon),
};