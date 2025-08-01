import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { paginationArgs } from "../schemas/base";
import { createSearchField } from "../schemas/search";
import { toolResult, noResults, createPaginationHeader } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

/**
 * Schema for companies search arguments
 */
export const companiesArgs = z.object({
  ...paginationArgs.shape,
  query: createSearchField(
    "company name, alternative names, domains, and ticker symbol"
  ),
  industry: createSearchField("company industry"),
  sector: createSearchField("company sector classification"),
  domains: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by company domains or websites (e.g., apple.com, microsoft.com)"
    ),
});

/**
 * Search for corporations and businesses
 * 
 * This tool helps you find information about companies and businesses including:
 * - Public and private corporations
 * - Startups and established businesses
 * - Non-profit organizations
 * - Government entities
 * - Any other business entities
 * 
 * Search capabilities:
 * - Company name and alternative name search
 * - Domain and website filtering
 * - Industry and sector classification filtering
 * - Ticker symbol search for public companies
 * - Comprehensive business information retrieval
 * 
 * Returns detailed company information including:
 * - Company name and alternative names
 * - CEO and leadership information
 * - Employee count and company size
 * - Industry and sector classification
 * - Business descriptions and activities
 * - Geographic location and headquarters
 * - Website domains and online presence
 * 
 * @param perigon - The Perigon API client instance
 * @returns Tool callback function for MCP
 */
export function searchCompanies(perigon: Perigon): ToolCallback {
  return async ({
    page,
    size,
    query,
    domains,
    industry,
    sector,
  }: z.infer<typeof companiesArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchCompanies({
        q: query,
        page,
        size,
        domain: domains,
        industry,
        sector,
      });

      if (result.numResults === 0) return noResults;

      const companies = result.results.map((company) => {
        return `<company name="${company.name}">
CEO: ${company.ceo}
Description: ${company.description}
Full Time Employees: ${company.fullTimeEmployees}
Industry: ${company.industry}
Country: ${company.country}
</company>`;
      });

      let output = createPaginationHeader(
        result.numResults,
        page,
        size,
        "companies"
      );
      output += "\n<companies>\n";
      output += companies.join("\n\n");
      output += "\n</companies>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching companies:", error);
      return toolResult(
        `Error: Failed to search companies: ${await createErrorMessage(error)}`
      );
    }
  };
}

/**
 * Tool definition for companies search
 */
export const companiesTool: ToolDefinition = {
  name: "search_companies",
  description:
    "Find corporations and businesses by name, domain, or industry. Returns company profiles with CEO information, employee count, industry classification, and business descriptions.",
  parameters: companiesArgs,
  createHandler: (perigon: Perigon) => searchCompanies(perigon),
};