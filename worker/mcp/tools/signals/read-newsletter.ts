import { SignalToolDefinition } from "./types";
import { readNewsletterSchema } from "./schemas";
import { listNewslettersTool } from "./list-newsletters";

export const readNewsletterTool = {
  name: "signal_insights_read_newsletter",
  description:
    "Fetch a full newsletter by UUID and return it as markdown (YAML frontmatter + body). " +
    `Use after ${listNewslettersTool.name} to get complete briefing content for context or analysis. ` +
    "Only works for newsletters belonging to TOPIC signals.",
  parameters: readNewsletterSchema,
  createHandler:
    (insightsApi) =>
    async ({ newsletterUuid }) =>
      insightsApi.readNewsletter(newsletterUuid),
} as const satisfies SignalToolDefinition<typeof readNewsletterSchema>;
