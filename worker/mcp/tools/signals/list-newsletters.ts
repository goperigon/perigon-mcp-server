import { SignalToolDefinition } from "./types";
import { listNewslettersSchema } from "./schemas";

export const listNewslettersTool = {
  name: "signal_insights_list_newsletters",
  description:
    "List newsletters (briefings) for a TOPIC signal. " +
    "Returns title, short excerpt (~500 chars), and timestamps — not full content. " +
    "Only works for TOPIC signals; EVENT and MENTIONS will error. " +
    "Use after signal_insights_read_signal confirms classificationType is TOPIC, " +
    "then call signal_insights_read_newsletter for full content.",
  parameters: listNewslettersSchema,
  createHandler: (insightsApi) => async (args) =>
    insightsApi.listNewsletters(args),
} as const satisfies SignalToolDefinition<typeof listNewslettersSchema>;
