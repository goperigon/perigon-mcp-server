/**
 * MCP `prompts` capability: reusable multi-step research playbooks.
 *
 * Prompts are pull-based — a host only pays for one when a user or model
 * explicitly invokes it — so this adds capability without any always-on
 * token cost. Each prompt returns a single user-role message that spells
 * out the exact tool sequence (with the caller's arguments already
 * substituted in), so a host that surfaces prompts gets correct chaining
 * for free instead of relying on the model to reconstruct it from
 * `perigon://reference/chaining`.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  newsArticlesTool,
  newsStoriesTool,
  storyHistoryTool,
  summarizeTool,
  journalistsTool,
  peopleTool,
  companiesTool,
  topicsTool,
  avgSentimentTool,
  articleCountsTool,
  topEntitiesTool,
  topPeopleTool,
  topCompaniesTool,
  topTopicsTool,
} from "./tools";

const textResult = (text: string) => ({
  messages: [
    {
      role: "user" as const,
      content: { type: "text" as const, text },
    },
  ],
});

export function registerResearchPrompts(server: McpServer): void {
  server.registerPrompt(
    "entity_deep_dive",
    {
      title: "Entity deep dive",
      description:
        "Resolve a person, company, or topic to its canonical ID and build a full coverage picture: mentions, trend, and narratives.",
      argsSchema: {
        entityType: z
          .enum(["person", "company", "topic"])
          .describe("Which entity family to research."),
        entityName: z.string().describe("Name of the person, company, or topic."),
      },
    },
    ({ entityType, entityName }) => {
      const steps: Record<string, string> = {
        person: `1. Call \`${peopleTool.name}(name="${entityName}")\` and take the \`wikidataId\` of the best match.
2. Call \`${newsArticlesTool.name}(personWikidataId=[<id>])\` for recent coverage — prefer this over a name filter to avoid collisions.
3. Call \`${articleCountsTool.name}\` and \`${avgSentimentTool.name}\` with identical \`personWikidataId\` filters for a paired volume/sentiment trend.
4. Call \`${newsStoriesTool.name}(personWikidataId=[<id>])\` for the underlying narratives, if any.`,
        company: `1. Call \`${companiesTool.name}(name="${entityName}")\` and take the \`id\`, \`domains\`, and ticker \`symbols\` of the best match.
2. Call \`${newsArticlesTool.name}(companyId=[<id>])\` (or \`companyDomain\`/\`companySymbol\`) for recent coverage.
3. Call \`${articleCountsTool.name}\` and \`${avgSentimentTool.name}\` with identical company filters for a paired volume/sentiment trend.
4. Call \`${newsStoriesTool.name}(companyId=[<id>])\` for the underlying narratives.`,
        topic: `1. Call \`${topicsTool.name}(name="${entityName}")\` to get the exact taxonomy name — the \`topic\` filter does not fuzzy-match.
2. Call \`${newsArticlesTool.name}(topic=[<exact name>])\` for recent coverage.
3. Call \`${articleCountsTool.name}\` and \`${avgSentimentTool.name}\` with identical \`topic\` filters for a paired volume/sentiment trend.
4. Call \`${topEntitiesTool.name}(topic=[<exact name>])\` for the people and companies most associated with this topic.`,
      };
      return textResult(
        `Research "${entityName}" as a ${entityType} using this sequence, substituting the IDs you resolve at each step:\n\n${steps[entityType]}\n\nReport the resolved ID, the volume/sentiment trend, and the 2-3 most relevant narratives or entities found.`,
      );
    },
  );

  server.registerPrompt(
    "narrative_trace",
    {
      title: "Narrative trace",
      description:
        "Find a news story cluster and trace how it evolved over time, then pull its member articles.",
      argsSchema: {
        query: z.string().describe("Search query describing the news story or event."),
      },
    },
    ({ query }) =>
      textResult(
        `Trace the narrative for "${query}" using this sequence:\n\n1. Call \`${newsStoriesTool.name}(q="${query}")\` and take the \`id\` (clusterId) of the best-matching story.\n2. Call \`${storyHistoryTool.name}(clusterIds=[<id>])\` to see how the story's coverage, sentiment, and key points evolved over time.\n3. Call \`${newsArticlesTool.name}(newsStoryIds=[<id>])\` to pull the member articles.\n\nSummarize the story's arc (how it started, key turning points, current state) and cite the most significant articles.`,
      ),
  );

  server.registerPrompt(
    "coverage_trend",
    {
      title: "Coverage trend",
      description:
        "Get a paired volume and sentiment trend for a query or filter set over a date range.",
      argsSchema: {
        query: z.string().optional().describe("Search query to filter articles by."),
        from: z.string().optional().describe("Start date (ISO 8601 or yyyy-mm-dd)."),
        to: z.string().optional().describe("End date (ISO 8601 or yyyy-mm-dd)."),
      },
    },
    ({ query, from, to }) => {
      const filters = [
        query ? `q="${query}"` : null,
        from ? `from="${from}"` : null,
        to ? `to="${to}"` : null,
      ]
        .filter(Boolean)
        .join(", ");
      return textResult(
        `Build a coverage trend using these identical filters on both calls (${filters || "no filters — full corpus"}):\n\n1. Call \`${articleCountsTool.name}(${filters}, splitBy="DAY")\` for volume over time.\n2. Call \`${avgSentimentTool.name}(${filters}, splitBy="DAY")\` for sentiment over the same buckets.\n\nDescribe how volume and sentiment moved together or diverged, and call out the bucket with the largest change.`,
      );
    },
  );

  server.registerPrompt(
    "journalist_beat_profile",
    {
      title: "Journalist beat profile",
      description:
        "Profile a journalist's beat: who they are, what they cover, and their recent output.",
      argsSchema: {
        journalistName: z.string().describe("The journalist's name to search for."),
      },
    },
    ({ journalistName }) =>
      textResult(
        `Profile the journalist "${journalistName}" using this sequence:\n\n1. Call \`${journalistsTool.name}(name="${journalistName}")\` and take the \`id\` of the best match. Note their \`locations\` (based-in) versus \`topCountries\` (reporting focus) — these are different signals, do not conflate them.\n2. Call \`${newsArticlesTool.name}(journalistIds=[<id>])\` for their recent coverage.\n3. Call \`${topEntitiesTool.name}(entity=["topics"], journalistId=[<id>])\` to summarize their beat by topic frequency.\n\nSummarize who they are, where they are based/what they cover, and their dominant beat topics.`,
      ),
  );

  server.registerPrompt(
    "competitive_landscape",
    {
      title: "Competitive landscape",
      description:
        "Compare news coverage volume and sentiment across two or more companies.",
      argsSchema: {
        companyNames: z
          .string()
          .describe("Comma-separated list of company names to compare (e.g. \"Apple, Samsung\")."),
      },
    },
    ({ companyNames }) => {
      const names = companyNames
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
      return textResult(
        `Compare coverage across these companies: ${names.join(", ")}.\n\nFor each company:\n1. Call \`${companiesTool.name}(name="<company>")\` and take its \`id\`.\n2. Call \`${articleCountsTool.name}(companyId=[<id>])\` and \`${avgSentimentTool.name}(companyId=[<id>])\` with identical date ranges across all companies for a fair comparison.\n\nThen build a comparison covering relative volume, sentiment, and any notable narratives via \`${newsStoriesTool.name}(companyId=[<id>])\` per company.`,
      );
    },
  );

  server.registerPrompt(
    "spike_explainer",
    {
      title: "Spike explainer",
      description:
        "Identify a trending person, company, or topic and explain why coverage is spiking.",
      argsSchema: {
        entityType: z
          .enum(["person", "company", "topic"])
          .describe("Which entity family to check for spikes."),
      },
    },
    ({ entityType }) => {
      const spikeTool = {
        person: topPeopleTool.name,
        company: topCompaniesTool.name,
        topic: topTopicsTool.name,
      }[entityType];
      return textResult(
        `Explain the top spike among ${entityType}s using this sequence:\n\n1. Call \`${spikeTool}()\` and take the top-ranked result's \`wikidataId\` (or name, for topics) and its \`spikeScore\`/\`currentMentions\` versus \`baselineMentions\`.\n2. Search the current window for that entity with \`${newsArticlesTool.name}\` using the matching identifier filter (\`personWikidataId\`, \`companyId\`, or \`topic\`).\n3. Call \`${summarizeTool.name}\` on those results to explain the likely cause of the spike.\n\nReport the entity, the magnitude of the spike (relative and absolute), and the probable cause.`,
      );
    },
  );
}
