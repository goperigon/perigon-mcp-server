import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import type { SocialXPost } from "../../../types/social";
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

export const xPostsArgs = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .describe(
      'X search query using X operators, e.g. ("OpenAI" OR ChatGPT) lang:en -is:retweet. Accounts: from:handle (never a URL). Time window: since:YYYY-MM-DD / until:YYYY-MM-DD. Do not add ranking words like viral or trending — use searchType instead.',
    ),
  searchType: z
    .enum(["TOP", "LATEST", "MEDIA"])
    .default("LATEST")
    .describe(
      "LATEST: newest first. TOP: X's Top tab, a higher-engagement set (use for top, viral, or trending posts). MEDIA: posts with images or video.",
    ),
  cursor: z
    .string()
    .optional()
    .describe(
      "Cursor from a previous call's output. Requires the same query and searchType as that call.",
    ),
});

function formatXPost(post: SocialXPost): string {
  const media = [
    post.photoUrls?.length ? `${post.photoUrls.length} photo(s)` : null,
    post.videoUrls?.length ? `${post.videoUrls.length} video(s)` : null,
  ].filter(Boolean);
  return [
    `<x_post id="${post.id}" url="${post.url}" author="@${post.author.screenName}"${post.createdAt ? ` created_at="${post.createdAt}"` : ""}${post.lang ? ` lang="${post.lang}"` : ""}>`,
    `Text: ${truncateText(post.text)}`,
    `Engagement: ${formatMetrics([
      ["views", post.views],
      ["likes", post.likes],
      ["reposts", post.reposts],
      ["replies", post.replies],
      ["quotes", post.quotes],
      ["bookmarks", post.bookmarks],
    ])}`,
    ...(media.length > 0 ? [`Media: ${media.join(", ")}`] : []),
    `</x_post>`,
  ].join("\n");
}

export function searchXPosts(
  perigon: Perigon,
): ToolCallback<typeof xPostsArgs> {
  return async ({
    query,
    searchType,
    cursor,
  }: z.infer<typeof xPostsArgs>): Promise<CallToolResult> => {
    try {
      const result = await perigon.searchXPosts({
        q: query,
        searchType,
        cursor,
      });
      if (result.results.length === 0 && !result.nextCursor) return noResults;
      return toolResult(
        [
          resultHeader(result, "X posts"),
          ...result.results.map(formatXPost),
          cursorFooter(result),
        ].join("\n\n"),
      );
    } catch (error) {
      console.error("Error searching X posts:", error);
      return toolResult(
        `Error: Failed to search X posts: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const xPostsTool = {
  name: "search_x_posts",
  title: "Search X posts",
  description: `Search public posts on X (Twitter) by keyword, hashtag, or account, with likes/reposts/views. Use for social reaction, public opinion, and what specific accounts are saying — complementary to news search. ${SOCIAL_QUOTA_NOTE}`,
  parameters: xPostsArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  createHandler: (perigon: Perigon) => searchXPosts(perigon),
} satisfies ToolDefinition<typeof xPostsArgs>;
