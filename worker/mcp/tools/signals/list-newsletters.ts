import { SignalToolDefinition } from "./types";
import { listNewslettersSchema } from "./schemas";

export const listNewslettersTool = {
  name: "signal_insights_list_newsletters",
  description:
    "List newsletters (briefings) for a TOPIC signal: title, ~500-char excerpt, and timestamps. " +
    "EVENT and MENTIONS signals error. Use signal_insights_read_newsletter for full content.",
  parameters: listNewslettersSchema,
  annotations: {
    title: "List monitor briefings",
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
  },
  createHandler: (insightsApi) => async (args) =>
    insightsApi.listNewsletters(args),
} as const satisfies SignalToolDefinition<typeof listNewslettersSchema>;
