import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
import { deriveCapabilities } from "../../capabilities";

export const apiAccessArgs = z.object({});

/**
 * Reports this API key's scopes, organization, usage quota, pagination
 * limits, and the entitlement behavior derived from those scopes (stripped
 * response fields, blocked filter params, date-window clamps). Calling
 * `getLimits()` does not count against the account's quota.
 */
export function getApiAccess(
  perigon: Perigon,
): ToolCallback<typeof apiAccessArgs> {
  return async (): Promise<CallToolResult> => {
    try {
      const [introspection, limitsResult] = await Promise.all([
        perigon.introspection(),
        perigon.getLimits(),
      ]);
      const limits = limitsResult.data;
      const report = deriveCapabilities(introspection.scopes);

      let output = `<api_access organization_id="${introspection.organizationId}" organization_name="${limits.organizationName}">\n`;
      output += `Scopes: ${introspection.scopes.join(", ") || "none"}\n`;
      output += `Requests Used: ${limits.requestsUsed}${limits.requestLimit != null ? ` / ${limits.requestLimit}` : " (no limit)"}\n`;
      output += `Max Page Size: ${limits.maxPageSize}\n`;
      output += `Pagination Limit: ${limits.paginationLimit}\n`;
      output += `Article Content Truncation: ${limits.articleContentTruncation ?? "none"}\n`;
      if (limits.resetAt) output += `Quota Resets At: ${limits.resetAt} (utc)\n`;
      if (limits.subscriptionCancelAt)
        output += `Subscription Cancels At: ${limits.subscriptionCancelAt} (utc)\n`;

      output += `\n<capabilities>\n`;
      output += `Article fields always null for this key: ${report.strippedArticleFields.join(", ") || "none"}\n`;
      output += `Filter params that will 403 for this key: ${report.blockedFilterParams.join(", ") || "none"}\n`;
      output += `Journalist email visible: ${report.hasJournalistEmail}\n`;
      output += `Pagination (page > 0) allowed — journalists: ${report.paginationAllowed.journalists}, sources: ${report.paginationAllowed.sources}, people: ${report.paginationAllowed.people}, companies: ${report.paginationAllowed.companies}, wikipedia: ${report.paginationAllowed.wikipedia}\n`;
      if (report.dateWindowLimits.historicalFloor) {
        output += `Historical floor for 'from' (no HISTORICAL_NEWS): ${report.dateWindowLimits.historicalFloor.toISOString()}\n`;
      }
      if (report.dateWindowLimits.realTimeCeiling) {
        output += `Real-time ceiling for 'to' (no REAL_TIME_NEWS): ${report.dateWindowLimits.realTimeCeiling.toISOString()}\n`;
      }
      output += `</capabilities>\n`;
      output += `</api_access>`;

      return toolResult(output);
    } catch (error) {
      console.error("Error fetching API access:", error);
      return toolResult(
        `Error: Failed to fetch API access: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const apiAccessTool = {
  name: "get_api_access",
  title: "Get API access and entitlements",
  description:
    "Report this API key's scopes, organization, usage quota, pagination limits, and the entitlement behavior those scopes imply (which article fields always come back null, which filter params will 403, and any silent date-window clamps). Call this once at the start of a session, or whenever a field is unexpectedly null, a 403 occurs, or coverage before/after a date seems to be missing — a null field or empty date range may reflect this key's plan rather than absent data. Calling this tool does not count against the account's request quota.",
  parameters: apiAccessArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  createHandler: (perigon: Perigon) => getApiAccess(perigon),
} satisfies ToolDefinition<typeof apiAccessArgs>;
