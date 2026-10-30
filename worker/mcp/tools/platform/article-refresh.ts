import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";

export const articleRefreshArgs = z.object({
  jobId: z
    .string()
    .uuid()
    .optional()
    .describe("Check status of a refresh job submitted elsewhere by its job ID."),
  articleIds: z
    .array(z.string())
    .max(100)
    .optional()
    .describe(
      "Peek cached refresh data for these article IDs, best-effort, without scheduling any processing.",
    ),
});

export function getArticleRefresh(
  perigon: Perigon,
): ToolCallback<typeof articleRefreshArgs> {
  return async ({
    jobId,
    articleIds,
  }: z.infer<typeof articleRefreshArgs>): Promise<CallToolResult> => {
    try {
      if (jobId) {
        const result = await perigon.getArticleRefreshJob(jobId);
        return toolResult(
          `<article_refresh_job id="${result.jobId}" status="${result.status}">\n${JSON.stringify(result.results, null, 2)}\n</article_refresh_job>`,
        );
      }

      if (articleIds && articleIds.length > 0) {
        const result = await perigon.peekArticleRefresh(articleIds);
        if (!result.results || result.results.length === 0) {
          return toolResult("No cached refresh data found for these article IDs.");
        }
        return toolResult(
          `<article_refresh_peek>\n${JSON.stringify(result.results, null, 2)}\n</article_refresh_peek>`,
        );
      }

      return toolResult("Error: provide either jobId or articleIds.");
    } catch (error) {
      console.error("Error fetching article refresh data:", error);
      return toolResult(
        `Error: Failed to fetch article refresh data: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const articleRefreshTool = {
  name: "article_refresh",
  title: "Check article refresh job status or peek cache",
  description:
    "Check the status of a background article-refresh job by ID, or peek best-effort cached refresh data for up to 100 article IDs without starting a job. Read-only — this tool cannot submit new refresh jobs or spend refresh credits; it only observes jobs submitted elsewhere (e.g. via the REST API directly).",
  parameters: articleRefreshArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  createHandler: (perigon: Perigon) => getArticleRefresh(perigon),
} satisfies ToolDefinition<typeof articleRefreshArgs>;
