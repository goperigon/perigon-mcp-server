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
} from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

/**
 * Schema for companies search arguments
 */
export const companiesArgs = z.object({
  ...paginationArgs.shape,
  query: createSearchField(
    "company name, alternative names, domains, and ticker symbol",
  ),
  name: createSearchField("name").describe("Like query, name only."),
  industry: createSearchField("industry").describe("Like query, on industry."),
  sector: createSearchField("sector").describe("Like query, on sector."),
  domains: z
    .array(z.string())
    .optional()
    .describe("Company domains (e.g. apple.com)."),
  symbol: z
    .array(z.string())
    .optional()
    .describe("Ticker symbols (e.g. AAPL)."),
  id: z.array(z.string()).optional().describe("Perigon company IDs."),
  country: z
    .array(z.string())
    .optional()
    .describe("Headquarters country codes (e.g. us, gb)."),
  exchange: z
    .array(z.string())
    .optional()
    .describe("Stock exchanges (e.g. NASDAQ, NYSE)."),
  numEmployeesFrom: z
    .number()
    .int()
    .optional()
    .describe("Minimum employee count."),
  numEmployeesTo: z
    .number()
    .int()
    .optional()
    .describe("Maximum employee count."),
  ipoFrom: z
    .string()
    .transform((str) => (str === "" ? undefined : new Date(str)))
    .optional()
    .describe("IPO on or after this date."),
  ipoTo: z
    .string()
    .transform((str) => (str === "" ? undefined : new Date(str)))
    .optional()
    .describe("IPO on or before this date."),
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
export function searchCompanies(
  perigon: Perigon,
): ToolCallback<typeof companiesArgs> {
  return async ({
    page,
    size,
    query,
    name,
    domains,
    symbol,
    id: companyIds,
    country,
    exchange,
    industry,
    sector,
    numEmployeesFrom,
    numEmployeesTo,
    ipoFrom,
    ipoTo,
  }: z.infer<typeof companiesArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchCompanies({
        q: query,
        name,
        page,
        size,
        domain: domains,
        symbol,
        id: companyIds,
        country,
        exchange,
        industry,
        sector,
        numEmployeesFrom,
        numEmployeesTo,
        ipoFrom,
        ipoTo,
      });

      if (result.numResults === 0) return noResults;

      const companies = result.results.map((company) => {
        const tickers =
          company.symbols?.map((s) => s.symbol).filter(Boolean).join(", ") ||
          "N/A";
        return `<company id="${company.id ?? ""}" name="${company.name}">
Alt Names: ${company.altNames?.join(", ") || "N/A"}
Domains: ${company.domains?.join(", ") || "N/A"}
Tickers: ${tickers}
CEO: ${company.ceo ?? "N/A"}
Description: ${company.description ?? "N/A"}
Full Time Employees: ${company.fullTimeEmployees ?? "N/A"}
Industry: ${company.industry ?? "N/A"}
Sector: ${company.sector ?? "N/A"}
Country: ${company.country ?? "N/A"}
Headquarters: ${[company.city, company.state].filter(Boolean).join(", ") || "N/A"}
</company>`;
      });

      let output = createPaginationHeader(
        result.numResults,
        page,
        size,
        "companies",
      );
      output += "\n<companies>\n";
      output += companies.join("\n\n");
      output += "\n</companies>";

      return toolResult(output);
    } catch (error) {
      console.error("Error searching companies:", error);
      return toolResult(
        `Error: Failed to search companies: ${await createErrorMessage(error)}`,
      );
    }
  };
}

/**
 * Tool definition for companies search
 */
export const companiesTool = {
  name: "search_companies",
  title: "Companies",
  description:
    "Search companies by name, domain, ticker, industry, sector, country, or exchange. Returns id, domains, tickers, CEO, employee count, industry/sector, headquarters, and description. Pass id/domains/symbol to search_news_articles(companyId|companyDomain|companySymbol) for coverage.",
  parameters: companiesArgs,
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false,
  },
  createHandler: (perigon: Perigon) => searchCompanies(perigon),
} satisfies ToolDefinition<typeof companiesArgs>;
