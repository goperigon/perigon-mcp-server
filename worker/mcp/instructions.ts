import { newsArticlesTool } from "./tools/search/news-articles";
import { newsStoriesTool } from "./tools/search/news-stories";
import { storyHistoryTool } from "./tools/search/story-history";
import { locationNewsTool } from "./tools/use-cases/location-news";
import { journalistsTool } from "./tools/search/journalists";
import { sourcesTool } from "./tools/search/sources";
import { topicsTool } from "./tools/search/topics";
import { peopleTool } from "./tools/search/people";
import { personNewsTool } from "./tools/use-cases/person-news";
import { companiesTool } from "./tools/search/companies";
import { companyNewsTool } from "./tools/use-cases/company-news";
import { wikipediaTool } from "./tools/search/wikipedia";
import { wikipediaVectorTool } from "./tools/search/wikipedia-vector";
import { newsVectorTool } from "./tools/search/news-vector";
import { summarizeTool } from "./tools/search/summarize";
import { avgSentimentTool } from "./tools/search/stats-avg-sentiment";
import { articleCountsTool } from "./tools/search/stats-article-counts";
import { topEntitiesTool } from "./tools/search/stats-top-entities";
import { topPeopleTool } from "./tools/search/stats-top-people";
import { topCompaniesTool } from "./tools/search/stats-top-companies";
import { apiAccessTool } from "./tools/access/api-access";
import { sourceByIdTool } from "./tools/platform/source-by-id";
import { topTopicsTool } from "./tools/platform/top-topics";
import { storyStatsTool } from "./tools/platform/story-stats";
import { watchlistsTool } from "./tools/platform/watchlists";
import { sourceGroupsTool } from "./tools/platform/source-groups";
import { contactPointsTool } from "./tools/platform/contact-points";
import { articleRefreshTool } from "./tools/platform/article-refresh";
import { createWorkspaceTool } from "./tools/signals/create-workspace";
import { searchSignalsTool } from "./tools/signals/search-signals";
import { readSignalTool } from "./tools/signals/read-signal";
import { listNewslettersTool } from "./tools/signals/list-newsletters";
import { readNewsletterTool } from "./tools/signals/read-newsletter";
import { exportEventsTool } from "./tools/signals/export-events";
import { executeCodeTool } from "./tools/signals/execute-code";
import { previewChartTool } from "./tools/signals/preview-chart";
import { shellTool } from "./tools/signals/shell";
import { listFilesTool } from "./tools/signals/list-files";
import { grepTool } from "./tools/signals/grep";
import { readFileTool } from "./tools/signals/read-file";
import { writeFileTool } from "./tools/signals/write-file";
import { strReplaceTool } from "./tools/signals/str-replace";
import { listMonitorsTool } from "./tools/monitors/list-monitors";
import { getMonitorTool } from "./tools/monitors/get-monitor";
import { getMonitorEventsTool } from "./tools/monitors/get-monitor-events";
import { getMonitorNewslettersTool } from "./tools/monitors/get-monitor-newsletters";
import { getMonitorSummariesTool } from "./tools/monitors/get-monitor-summaries";
import { createMonitorTool } from "./tools/monitors/create-monitor";
import { updateMonitorTool } from "./tools/monitors/update-monitor";
import { setMonitorStatusTool } from "./tools/monitors/set-monitor-status";
import { WORKSPACE_DIR, DATA_DIR, OUTPUT_DIR } from "./constants";
import {
  FIELDS_RESOURCE_URI,
  CHAINING_RESOURCE_URI,
  ENTITLEMENTS_RESOURCE_URI,
  CHARTS_RESOURCE_URI,
} from "./reference-resources";

export { WORKSPACE_DIR, DATA_DIR, OUTPUT_DIR };

export const MCP_INSTRUCTIONS = `\
Perigon is a news intelligence API with five tool groups: News Search, Stats, Entitlements & Platform, Monitors, and Signal Insights.

## News Search

Search and filter news articles, stories, journalists, and sources from 200k+ global publications. No setup required.

Tools:
- \`${newsArticlesTool.name}\` — primary search. Supports Boolean queries (AND, OR, NOT), exact phrases, wildcards, filters by category/topic/source/sentiment/location/company/person.
- \`${newsStoriesTool.name}\` — search clustered headlines that group related articles across sources.
- \`${storyHistoryTool.name}\` — track how a news story evolved over time.
- \`${locationNewsTool.name}\` — shortcut for "what's happening in [city/state/country]?"
- \`${journalistsTool.name}\` — find journalists by name, beat, publication, or location (based-in vs. covers — see chaining resource).
- \`${sourcesTool.name}\` / \`${sourceByIdTool.name}\` — find or look up news publishers by name, domain, or ID.
- \`${topicsTool.name}\` / \`${topTopicsTool.name}\` — browse the topic taxonomy, or find topics currently spiking.
- \`${peopleTool.name}\` / \`${personNewsTool.name}\` — find people entities and their news coverage.
- \`${companiesTool.name}\` / \`${companyNewsTool.name}\` — find companies and their news coverage.
- \`${wikipediaTool.name}\` / \`${wikipediaVectorTool.name}\` — search Wikipedia for background context.
- \`${newsVectorTool.name}\` — semantic/vector search over recent news articles.
- \`${summarizeTool.name}\` — get an AI-generated summary of news on a topic.

## Stats

Aggregate metrics computed server-side — prefer these over counting search results by hand.

- \`${avgSentimentTool.name}\`, \`${articleCountsTool.name}\` — sentiment and volume over time; call both with identical filters for a paired trend view.
- \`${topEntitiesTool.name}\`, \`${topPeopleTool.name}\`, \`${topCompaniesTool.name}\` — most-mentioned entities and coverage spikes.
- \`${storyStatsTool.name}\` — story-level volume or velocity for a cluster.

## Entitlements & Platform

- \`${apiAccessTool.name}\` — this key's scopes, org, quota, and derived capability report. Call once per session, or after a 403 or an unexpectedly null/empty field.
- \`${watchlistsTool.name}\`, \`${sourceGroupsTool.name}\`, \`${contactPointsTool.name}\`, \`${articleRefreshTool.name}\` — read platform resources used to scope monitors and searches (create/update variants exist for watchlists and source groups; only use them when the user explicitly asks).

## Monitors

Create, configure, and read output from Perigon monitors via the public \`/v1/api/monitors\` API. Always available, no sandbox workspace required.

- \`${listMonitorsTool.name}\` / \`${getMonitorTool.name}\` — discover monitors and inspect configuration before reading output or making changes.
- \`${getMonitorEventsTool.name}\` — structured EVENT/MENTIONS output with extracted schema data, summaries, entities, related articles.
- \`${getMonitorNewslettersTool.name}\` — scheduled TOPIC briefings with markdown content and citations.
- \`${getMonitorSummariesTool.name}\` — rolling AI-generated summary history.
- \`${createMonitorTool.name}\` / \`${updateMonitorTool.name}\` / \`${setMonitorStatusTool.name}\` — lifecycle management. Only mutate a monitor when the user explicitly requests it; create as DRAFT unless asked to activate; ARCHIVED cannot be reversed.

## Signal Insights

Analyze Perigon monitoring signals. Requires a workspace for sandbox tools (export, code, charts). Signal classification TOPIC is distinct from \`${topicsTool.name}\` (news taxonomy).

1. \`${createWorkspaceTool.name}\` — required once per conversation before export/code/file tools; never invent a workspace ID.
2. \`${searchSignalsTool.name}\` → \`${readSignalTool.name}\` — find a signal and read its classificationType (EVENT, MENTIONS, or TOPIC).
3. EVENT/MENTIONS: \`${exportEventsTool.name}\` (structured query, not SQL) → \`${executeCodeTool.name}\` (pandas) → \`${previewChartTool.name}\` to display a chart. TOPIC: \`${listNewslettersTool.name}\` → \`${readNewsletterTool.name}\`.
4. \`${shellTool.name}\`, \`${listFilesTool.name}\`, \`${readFileTool.name}\`, \`${writeFileTool.name}\`, \`${grepTool.name}\`, \`${strReplaceTool.name}\` — sandbox file management. Save deliverables to ${OUTPUT_DIR}/ for the Artifacts panel.
5. Charts: only \`${previewChartTool.name}\` renders interactively — see \`${CHARTS_RESOURCE_URI}\` for the parser's strict formatting rules before writing plotting code.

## Rules

1. Resolve names to IDs before filtering wherever possible (\`search_companies\` → \`companyId\`, \`search_people\` → \`wikidataId\`) — IDs are unambiguous, names collide.
2. Pair \`${articleCountsTool.name}\` with \`${avgSentimentTool.name}\` using identical filters when asked about a trend.
3. A null or missing field may reflect this key's plan rather than absent data — check \`${ENTITLEMENTS_RESOURCE_URI}\` or call \`${apiAccessTool.name}\` before reporting absence.
4. Prefer stats tools over counting search results by hand; \`numResults\` caps at 10,000.
5. Never mutate a monitor, watchlist, or source group unless the user explicitly asks.
6. When chaining endpoints (name → ID → filtered search → stats) or unsure which tool fits, read \`${CHAINING_RESOURCE_URI}\` — it has worked playbooks per entity type.

## Resources

- \`${FIELDS_RESOURCE_URI}\` — response field reference: taxonomy distinctions, counting/scoring caveats, and API parameters intentionally not exposed here.
- \`${CHAINING_RESOURCE_URI}\` — worked ID-chaining playbooks per entity type (journalist, company, person, narrative, spike, topic, source).
- \`${ENTITLEMENTS_RESOURCE_URI}\` — this session's scope-to-behavior mapping: stripped fields, blocked filters, pagination, date clamps, and the 403/429/400 decision tree.
- \`${CHARTS_RESOURCE_URI}\` — Signal Insights chart formatting rules for \`${previewChartTool.name}\`.
`;
