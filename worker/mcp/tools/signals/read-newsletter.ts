import { SignalToolDefinition } from "./types";
import { readNewsletterSchema } from "./schemas";
import { listNewslettersTool } from "./list-newsletters";

export const readNewsletterTool = {
  name: "signal_insights_read_newsletter",
  description:
    "Fetch a full TOPIC-signal newsletter as markdown (YAML frontmatter + body), " +
    `by UUID from ${listNewslettersTool.name}.`,
  parameters: readNewsletterSchema,
  annotations: {
    title: "Read monitor briefing",
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
  },
  createHandler:
    (insightsApi) =>
    async ({ newsletterUuid }) =>
      insightsApi.readNewsletter(newsletterUuid),
} as const satisfies SignalToolDefinition<typeof readNewsletterSchema>;
