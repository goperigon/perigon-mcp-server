import type {
  SocialLinkedInFeedPost,
  SocialSearchResult,
} from "../../../types/social";

/** Post bodies (especially Reddit and LinkedIn) can run to thousands of characters. */
const MAX_TEXT_CHARS = 1500;

export const SOCIAL_QUOTA_NOTE =
  "Each call counts against the account's social request quota, separate from the news quota.";

export function truncateText(text: string | null | undefined): string {
  const trimmed = text?.trim();
  if (!trimmed) return "N/A";
  return trimmed.length > MAX_TEXT_CHARS
    ? `${trimmed.slice(0, MAX_TEXT_CHARS)}… [truncated]`
    : trimmed;
}

/** `likes 4, reposts 2`, skipping metrics the provider did not return. */
export function formatMetrics(
  metrics: Array<[label: string, value: number | null | undefined]>,
): string {
  const parts = metrics
    .filter(([, value]) => value != null)
    .map(([label, value]) => `${label} ${value}`);
  return parts.length > 0 ? parts.join(", ") : "N/A";
}

export function resultHeader(
  result: SocialSearchResult<unknown>,
  itemType: string,
): string {
  return `Returned ${result.results.length} ${itemType}.`;
}

/** How to fetch the next page; pagination state never survives a change of the other arguments. */
export function cursorFooter(result: SocialSearchResult<unknown>): string {
  return result.nextCursor
    ? `More results: call again with cursor="${result.nextCursor}" and identical other arguments.`
    : "No more results.";
}

export function formatLinkedInFeedPost(
  post: SocialLinkedInFeedPost,
  tag = "linkedin_post",
): string {
  const attrs = [
    post.activityType ? `activity_type="${post.activityType}"` : null,
    post.url ? `url="${post.url}"` : null,
    post.createdAt ? `created_at="${post.createdAt}"` : null,
  ].filter(Boolean);
  const author = post.author;
  const lines = [`<${tag}${attrs.length > 0 ? ` ${attrs.join(" ")}` : ""}>`];
  if (author) {
    const authorDetails = [author.occupation, author.type]
      .filter(Boolean)
      .join(", ");
    lines.push(
      `Author: ${author.name ?? author.publicIdentifier ?? "N/A"}${authorDetails ? ` (${authorDetails})` : ""}${author.url ? ` ${author.url}` : ""}`,
    );
  }
  if (post.text) lines.push(`Text: ${truncateText(post.text)}`);
  if (post.comment?.text) {
    lines.push(`Comment: ${truncateText(post.comment.text)}`);
  }
  if (post.reactionText) lines.push(`Reaction: ${post.reactionText}`);
  if (post.isRepost) {
    lines.push(
      `Repost of: ${post.originalPostUrl ?? post.sharedPost?.url ?? "N/A"}`,
    );
  }
  lines.push(
    `Engagement: ${formatMetrics([
      ["likes", post.likes],
      ["comments", post.comments],
      ["shares", post.shares],
    ])}`,
  );
  if (post.attachmentTypes && post.attachmentTypes.length > 0) {
    lines.push(`Attachments: ${post.attachmentTypes.join(", ")}`);
  }
  if (post.sharedPost) {
    lines.push(formatLinkedInFeedPost(post.sharedPost, "shared_post"));
  }
  lines.push(`</${tag}>`);
  return lines.join("\n");
}

export function formatLinkedInFeed(
  result: SocialSearchResult<SocialLinkedInFeedPost>,
  itemType: string,
): string {
  return [
    resultHeader(result, itemType),
    ...result.results.map((post) => formatLinkedInFeedPost(post)),
    cursorFooter(result),
  ].join("\n\n");
}
