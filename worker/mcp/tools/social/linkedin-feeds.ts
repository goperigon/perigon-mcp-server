import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Perigon } from "../../../lib/perigon";
import { ToolCallback, ToolDefinition } from "../types";
import { noResults, toolResult } from "../utils/formatting";
import { createErrorMessage } from "../utils/error-handling";
import { formatLinkedInFeed, SOCIAL_QUOTA_NOTE } from "./formatting";

const cursorArg = z
  .string()
  .optional()
  .describe(
    "Cursor from a previous call's output. Requires the same url and type as that call.",
  );

export const linkedInPersonActivityArgs = z.object({
  url: z
    .string()
    .trim()
    .url()
    .describe(
      "LinkedIn profile URL, e.g. https://www.linkedin.com/in/williamhgates. Resolve the person's profile URL first; never guess one.",
    ),
  type: z
    .enum(["POSTS", "COMMENTS", "REACTIONS"])
    .default("POSTS")
    .describe(
      "POSTS: their posts and reposts. COMMENTS: posts they commented on. REACTIONS: posts they reacted to.",
    ),
  cursor: cursorArg,
});

export const linkedInCompanyPostsArgs = z.object({
  url: z
    .string()
    .trim()
    .url()
    .describe(
      "LinkedIn company page URL, e.g. https://www.linkedin.com/company/google. Resolve the company's page URL first; never guess one.",
    ),
  type: z
    .enum(["ALL", "ARTICLES", "DOCUMENTS"])
    .default("ALL")
    .describe("Kind of posts to return."),
  cursor: cursorArg,
});

export function getLinkedInPersonActivity(
  perigon: Perigon,
): ToolCallback<typeof linkedInPersonActivityArgs> {
  return async (
    args: z.infer<typeof linkedInPersonActivityArgs>,
  ): Promise<CallToolResult> => {
    try {
      const result = await perigon.getLinkedInPersonActivity(args);
      if (result.results.length === 0 && !result.nextCursor) return noResults;
      return toolResult(formatLinkedInFeed(result, "LinkedIn activity items"));
    } catch (error) {
      console.error("Error fetching LinkedIn person activity:", error);
      return toolResult(
        `Error: Failed to fetch LinkedIn person activity: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export function getLinkedInCompanyPosts(
  perigon: Perigon,
): ToolCallback<typeof linkedInCompanyPostsArgs> {
  return async (
    args: z.infer<typeof linkedInCompanyPostsArgs>,
  ): Promise<CallToolResult> => {
    try {
      const result = await perigon.getLinkedInCompanyPosts(args);
      if (result.results.length === 0 && !result.nextCursor) return noResults;
      return toolResult(formatLinkedInFeed(result, "LinkedIn company posts"));
    } catch (error) {
      console.error("Error fetching LinkedIn company posts:", error);
      return toolResult(
        `Error: Failed to fetch LinkedIn company posts: ${await createErrorMessage(error)}`,
      );
    }
  };
}

export const linkedInPersonActivityTool = {
  name: "get_linkedin_person_activity",
  title: "Get LinkedIn person activity",
  description: `Get a LinkedIn member's recent posts, comments, or reactions by profile URL, newest first. Use to see what a specific executive or individual is saying or engaging with. Can take tens of seconds. ${SOCIAL_QUOTA_NOTE}`,
  parameters: linkedInPersonActivityArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  createHandler: (perigon: Perigon) => getLinkedInPersonActivity(perigon),
} satisfies ToolDefinition<typeof linkedInPersonActivityArgs>;

export const linkedInCompanyPostsTool = {
  name: "get_linkedin_company_posts",
  title: "Get LinkedIn company posts",
  description: `Get a LinkedIn company page's recent posts by page URL, newest first (about the last 12 months). Use to see a company's own announcements and messaging. Can take tens of seconds. ${SOCIAL_QUOTA_NOTE}`,
  parameters: linkedInCompanyPostsArgs,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  createHandler: (perigon: Perigon) => getLinkedInCompanyPosts(perigon),
} satisfies ToolDefinition<typeof linkedInCompanyPostsArgs>;
