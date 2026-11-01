/**
 * Social media tools (`/v1/social/*`). Kept out of `TOOL_DEFINITIONS` because
 * they are gated by the organization's social sources rather than API key
 * scopes. MCP sessions and the playground chat register only the tools the
 * organization can use; the playground tool list includes all of them with
 * their `socialSource` so the UI can lock unavailable ones.
 */
import { SocialSource } from "../../../types/types";
import type { ToolDefinition } from "../types";
import {
  linkedInCompanyPostsTool,
  linkedInPersonActivityTool,
} from "./linkedin-feeds";
import { linkedInPostsTool } from "./linkedin-posts";
import { redditPostsTool } from "./reddit-posts";
import { xPostsTool } from "./x-posts";

export {
  linkedInCompanyPostsTool,
  linkedInPersonActivityTool,
} from "./linkedin-feeds";
export { linkedInPostsTool } from "./linkedin-posts";
export { redditPostsTool } from "./reddit-posts";
export { xPostsTool } from "./x-posts";

const SOCIAL_TOOLS = {
  search_x_posts: xPostsTool,
  search_reddit_posts: redditPostsTool,
  search_linkedin_posts: linkedInPostsTool,
  get_linkedin_person_activity: linkedInPersonActivityTool,
  get_linkedin_company_posts: linkedInCompanyPostsTool,
} as const;

export type SocialToolName = keyof typeof SOCIAL_TOOLS;

export const SOCIAL_TOOL_DEFINITIONS: Record<
  SocialToolName,
  ToolDefinition<any>
> = SOCIAL_TOOLS;

export const SOCIAL_TOOL_NAMES = Object.keys(
  SOCIAL_TOOL_DEFINITIONS,
) as SocialToolName[];

/** The social source an organization needs for each tool (checked upstream by `SocialController`). */
export const SOCIAL_TOOL_SOURCES: Record<SocialToolName, SocialSource> = {
  search_x_posts: SocialSource.X,
  search_reddit_posts: SocialSource.REDDIT,
  search_linkedin_posts: SocialSource.LINKEDIN,
  get_linkedin_person_activity: SocialSource.LINKEDIN,
  get_linkedin_company_posts: SocialSource.LINKEDIN,
};
