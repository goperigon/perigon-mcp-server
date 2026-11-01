import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import type { SocialLinkedInPost } from "../../../types/social";
import { ToolCallback, ToolDefinition } from "../types";
import { noResults, toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
import {
  formatMetrics,
  resultHeader,
  SOCIAL_QUOTA_NOTE,
  truncateText,
} from "./formatting";

export const linkedInPostsArgs = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .describe(
      'LinkedIn keyword search, not X operators. Uppercase AND, OR, NOT; quotes for exact phrases; parentheses group clauses; a space is not AND. Example: ("OpenAI" OR "ChatGPT") AND layoffs.',
    ),
  sortBy: z
    .enum(["DATE_POSTED", "RELEVANCE"])
    .optional()
    .describe("DATE_POSTED: newest first. RELEVANCE: best match."),
  datePosted: z
    .enum(["PAST_24H", "PAST_WEEK", "PAST_MONTH"])
    .optional()
    .describe("Only posts published within this window."),
  contentType: z
    .enum(["PHOTOS", "VIDEOS", "JOBS", "LIVE_VIDEOS", "DOCUMENTS"])
    .optional()
    .describe("Only posts with this content type. Omit for all posts."),
  authorTitle: z
    .string()
    .trim()
    .optional()
    .describe(
      'Only posts by authors whose job title matches, e.g. "CEO". Only set when the user asks.',
    ),
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "Page number, starting at 1. Use the next page from a previous call's output with identical other arguments.",
    ),
});

function formatLinkedInPost(post: SocialLinkedInPost): string {
  const author = post.author;
  return [
    `<linkedin_post urn="${post.urn}"${post.url ? ` url="${post.url}"` : ""}${post.postedAt ? ` posted_at="${post.postedAt}"` : ""}>`,
    ...(author
      ? [
          `Author: ${author.fullName ?? author.username ?? "N/A"}${author.type ? ` (${author.type})` : ""}${author.url ? ` ${author.url}` : ""}`,
        ]
      : []),
    `Text: ${truncateText(post.text)}`,
    `Engagement: ${formatMetrics([
      ["reactions", post.reactions],
      ["likes", post.likes],
      ["comments", post.comments],
    ])}`,
    ...(post.reposted ? ["Repost: true"] : []),
    `</linkedin_post>`,
  ].join("\n");
}

export function searchLinkedInPosts(
  perigon: Perigon,
): ToolCallback<typeof linkedInPostsArgs> {
  return async ({
    query,
    ...rest
  }: z.infer<typeof linkedInPostsArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchLinkedInPosts({
        q: query,
        ...rest,
        authorTitle: rest.authorTitle || undefined,
      });
      if (result.results.length === 0 && !result.nextPage) return noResults;
      return toolResult(
        [
          resultHeader(result, "LinkedIn posts"),
          ...result.results.map(formatLinkedInPost),
          result.nextPage
            ? `More results: call again with page=${result.nextPage} and identical other arguments.`
            : "No more results.",
        ].join("\n\n"),
      );
    } catch (error) {
      console.error("Error searching LinkedIn posts:", error);
      return toolResult(
        `Error: Failed to search LinkedIn posts: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const linkedInPostsTool = {
  name: "search_linkedin_posts",
  title: "Search LinkedIn posts",
  description: `Search public LinkedIn posts by keyword, with author and reaction counts. Use for professional and B2B discussion, executive commentary, and hiring/industry chatter. Can take tens of seconds. ${SOCIAL_QUOTA_NOTE}`,
  parameters: linkedInPostsArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  createHandler: (perigon: Perigon) => searchLinkedInPosts(perigon),
} satisfies ToolDefinition<typeof linkedInPostsArgs>;
