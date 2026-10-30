import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import type { SocialRedditPost } from "../../../types/social";
import { ToolCallback, ToolDefinition } from "../types";
import { noResults, toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
import {
  cursorFooter,
  formatMetrics,
  resultHeader,
  SOCIAL_QUOTA_NOTE,
  truncateText,
} from "./formatting";

export const redditPostsArgs = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .describe(
      'Reddit search query. AND, OR, NOT are case sensitive. Field filters have no space after the colon: author:, flair:, self:true, selftext:, site:, subreddit:, title:, url: (quote multi-word values: title:"running shoe"). No X operators such as lang:.',
    ),
  subreddit: z
    .string()
    .trim()
    .optional()
    .describe(
      "Restrict to one subreddit, without the r/ prefix (e.g. devops). Omit to search all of Reddit; for several, use subreddit:a OR subreddit:b in the query.",
    ),
  sort: z
    .enum(["RELEVANCE", "HOT", "TOP", "NEW", "COMMENTS"])
    .optional()
    .describe("Result ranking. Defaults to Reddit's own ranking."),
  time: z
    .enum(["HOUR", "DAY", "WEEK", "MONTH", "YEAR", "ALL"])
    .optional()
    .describe("Time window. Only applies with sort=TOP; ignored otherwise."),
  cursor: z
    .string()
    .optional()
    .describe(
      "Cursor from a previous call's output. Requires the same query, subreddit, sort, and time as that call.",
    ),
});

function formatRedditPost(post: SocialRedditPost): string {
  const flags = [
    post.isSelf === false && post.linkUrl ? `link: ${post.linkUrl}` : null,
    post.flair ? `flair: ${post.flair}` : null,
    post.over18 ? "NSFW" : null,
    post.locked ? "locked" : null,
  ].filter(Boolean);
  return [
    `<reddit_post id="${post.id}"${post.url ? ` url="${post.url}"` : ""} subreddit="${post.subredditPrefixed ?? post.subreddit ?? ""}"${post.author ? ` author="u/${post.author}"` : ""}${post.createdAt ? ` created_at="${post.createdAt}"` : ""}>`,
    `Title: ${post.title ?? "N/A"}`,
    ...(post.text?.trim() ? [`Text: ${truncateText(post.text)}`] : []),
    `Engagement: ${formatMetrics([
      ["score", post.score],
      ["upvote_ratio", post.upvoteRatio],
      ["comments", post.numComments],
      ["crossposts", post.numCrossposts],
    ])}`,
    ...(flags.length > 0 ? [`Details: ${flags.join(", ")}`] : []),
    `</reddit_post>`,
  ].join("\n");
}

export function searchRedditPosts(
  perigon: Perigon,
): ToolCallback<typeof redditPostsArgs> {
  return async ({
    query,
    subreddit,
    sort,
    time,
    cursor,
  }: z.infer<typeof redditPostsArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchRedditPosts({
        q: query,
        subreddit: subreddit?.replace(/^\/?r\//i, "") || undefined,
        sort,
        time: sort === "TOP" ? time : undefined,
        cursor,
      });
      if (result.results.length === 0 && !result.nextCursor) return noResults;
      return toolResult(
        [
          resultHeader(result, "Reddit posts"),
          ...result.results.map(formatRedditPost),
          cursorFooter(result),
        ].join("\n\n"),
      );
    } catch (error) {
      console.error("Error searching Reddit posts:", error);
      return toolResult(
        `Error: Failed to search Reddit posts: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const redditPostsTool = {
  name: "search_reddit_posts",
  title: "Search Reddit posts",
  description: `Search Reddit posts by keyword, optionally within one subreddit, with score and comment counts. Use for community discussion, user experiences, and grassroots sentiment. ${SOCIAL_QUOTA_NOTE}`,
  parameters: redditPostsArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  createHandler: (perigon: Perigon) => searchRedditPosts(perigon),
} satisfies ToolDefinition<typeof redditPostsArgs>;
