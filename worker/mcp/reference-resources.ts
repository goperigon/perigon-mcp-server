/**
 * Long-form guidance moved out of `MCP_INSTRUCTIONS` and into on-demand MCP
 * resources. `MCP_INSTRUCTIONS` is a router — the six behavior-changing
 * rules plus a tool map and pointers here; anything occasional lives in one
 * of these four resources instead, fetched by URI only when needed.
 *
 * `perigon://reference/entitlements` is generated per session from
 * `capabilities.ts` so it reflects the calling key's actual scopes; the
 * other three are static.
 */
import type { CapabilityReport } from "./capabilities";

export const FIELDS_RESOURCE_URI = "perigon://reference/fields";
export const CHAINING_RESOURCE_URI = "perigon://reference/chaining";
export const ENTITLEMENTS_RESOURCE_URI = "perigon://reference/entitlements";
export const CHARTS_RESOURCE_URI = "perigon://reference/charts";

export const FIELDS_REFERENCE = `\
# Response field reference

## Four distinct taxonomies — do not conflate
- \`categories\` — broad editorial buckets (Politics, Tech, Sports).
- \`topics\` — granular subject tags from \`search_topics\`; the \`topic\` filter needs exact taxonomy names.
- \`taxonomies\` — hierarchical IAB-style classification, separate from topics.
- \`labels\` — editorial flags: Opinion, Paid-news, Non-news, Fact Check, Press Release.

## Counting and scoring
- \`numResults\` caps at 10,000 even when more match — use a stats tool (\`get_article_counts\`) for true volume, not \`numResults\`.
- Sentiment is three independent 0-1 scores (positive/negative/neutral), not one net score.
- \`spikeScore\` is relative (current vs. baseline rate); \`currentMentions\`/\`currentRatePerDay\` are absolute. \`normalizeByDay\` changes whether counts or per-day rates drive the comparison.
- \`score\` on an article is search relevance, not importance or quality.

## Articles and stories
- Reprints are deduplicated by default (\`showReprints=false\`); \`reprintGroupId\` links copies of the same wire story across outlets.
- A story (cluster) aggregates many articles: \`uniqueCount\`/\`totalCount\` are article counts, \`uniqueSources\` lists distinct publishers — high \`totalCount\` with low \`uniqueCount\` usually means syndication, not broad pickup.
- \`enContentWordCount\` (English content only) is useful for filtering shallow wire-copy from in-depth reporting.
- \`matchedAuthors\` on an article is the chaining hook to journalist profiles — feed the ids into \`search_journalists(journalistIds)\`.

## Journalists and sources
- A journalist's \`locations\` (up to five levels: country/state/county/city/area) is their own profile location and feeds \`location*\` filters verbatim; \`topCountries\` is reporting focus derived from published articles. These back two different filters — do not treat one as a proxy for the other.
- \`avgMonthlyPosts\` is posting volume, not authority.
- A source's \`monthlyVisits\` and \`globalRank\` are traffic/authority signals; \`avgMonthlyPosts\` is volume, independent of either.

## Entitlements
**A null field may mean an entitlement restriction, not absent data.** Before reporting "no sentiment" or "no clusterId," call \`get_api_access\` or check \`perigon://reference/entitlements\` — see that resource for the full mapping.

## Parameters intentionally not exposed as tool arguments
These exist on the API but are out of scope for this server: \`POST /v1/all\` complex Boolean query bodies, \`/v1/headlines\`, \`/v1/articles/taxonomy/classify\`, \`/v1/stats/ui/counts\`, and \`submit_article_refresh\` (job status/peek only, no submission). Use the REST API directly for these.
`;

export const CHAINING_REFERENCE = `\
# Cross-endpoint research playbooks

Resolve names to IDs before filtering wherever a tool offers both — IDs are unambiguous, names collide.

## Journalist beat profile
\`search_journalists\` → \`id\` → \`search_news_articles(journalistIds)\` for their coverage → \`get_top_entities(entity=["topics"], journalistId)\` to summarize their beat.

## Journalist by location — "based in" vs. "covers" are different queries
- **Based in a place**: \`search_journalists(locationCity | locationState | locationCounty | locationCountry)\` directly. Levels AND together — pass only the narrowest level the user named.
- **Covers a place**: \`search_journalists(countries)\` for country-level reporting focus, or for sub-country coverage run \`search_news_articles\` with its geo filters (city/state/county/area) and collect \`matchedAuthors\` journalist IDs, then \`search_journalists(journalistIds)\`. This is the only route to "who has been writing about Austin" versus "who lives near Austin." If \`matchedAuthors\` comes back stripped (entitlement gap), say so rather than silently substituting the location filter.
- A location query returning nothing is usually a casing mismatch (exact-term match: \`london\` fails, \`London\` works), not an absence of journalists — check casing before concluding there is no coverage.

## Company research
\`search_companies\` → \`id\`/\`domains\`/\`symbols\` → \`search_news_articles(companyId | companyDomain | companySymbol)\` for coverage → paired \`get_article_counts\` + \`get_avg_sentiment\` on identical filters for trend → \`search_news_stories\` for the underlying narratives.

## Person research
\`search_people\` → \`wikidataId\` → \`search_news_articles(personWikidataId)\`. Always prefer the Wikidata ID over \`personName\` to avoid name collisions.

## Narrative tracing
\`search_news_stories\` → \`id\` → \`search_story_history(clusterIds)\` to see how it evolved → \`search_news_articles(newsStoryIds)\` for the member articles.

## Spike explanation
\`get_top_people\` / \`get_top_companies\` / \`get_top_topics\` → take the \`wikidataId\` → search the current window for that entity → \`summarize_news\` to explain the cause of the spike.

## Topics
Call \`search_topics\` first to get the exact taxonomy name before using the \`topic\` filter elsewhere — it does not fuzzy-match.

## Sources and watchlists
\`search_sources\` or \`source_groups\` → domains → \`source\`/\`sourceGroup\` filters. \`watchlists\` resolves a saved list by name → \`watchlist\` filter on articles and stats tools.
`;

export const CHARTS_REFERENCE = `\
# Signal Insights chart rules (CRITICAL)

Charts rendered via \`signal_insights_preview_chart\` are automatically parsed into interactive widgets in the chat UI. The parser only supports: line, scatter, bar, pie, box_and_whisker.

To ensure charts render interactively:
- Always use \`signal_insights_preview_chart\` (not \`signal_insights_execute_code\`) for any chart you want the user to see.
- Use ONLY simple matplotlib calls: plt.plot() (line), plt.scatter(), plt.bar()/plt.barh(), plt.pie(), plt.boxplot().
- Call plt.show() at the end of EACH chart. One chart per plt.show() call.
- Do NOT combine multiple chart types in one figure (no fill_between + plot, no twin axes).
- Do NOT use plt.subplots() with multiple axes — create separate \`signal_insights_preview_chart\` calls instead, each with its own plt.figure() and plt.show().
- Do NOT use plt.annotate(), plt.fill_between(), plt.axhline(), or other decorative overlays — they prevent interactive parsing.
- Use plt.title(), plt.xlabel(), plt.ylabel() — these are parsed correctly.
- ALWAYS pass a meaningful label= to every plot/bar/scatter call (e.g. plt.plot(x, y, label="Revenue")). Without label=, matplotlib auto-names series "Line 0", "Group 0", etc.
- Call plt.legend() only when there are 2 or more series. For a single series, omit plt.legend() — it adds noise without value.
- Before charting grouped counts or top-N rankings, drop rows with missing category values (e.g. df.dropna(subset=["investor"]) or df[df["investor"].notna()]). Never plot null/NaN/empty categories — they often dominate the chart and mislead users.
- Use seaborn's simple wrappers (sns.lineplot, sns.barplot, sns.scatterplot, sns.boxplot) — they produce parseable output.
- NEVER use plotly, bokeh, altair, or write charts to HTML files.
- NEVER call plt.savefig() for charts you want displayed inline.
- If a complex visualization is truly needed (annotations, dual axes, heatmaps, etc.), you can render it and it will display correctly as a PNG. But **always** prefer interactive simpler charts.
- **Always** render charts on a light background.
`;

/** Renders the per-session entitlements resource from an already-derived capability report. */
export function renderEntitlementsReference(report: CapabilityReport): string {
  const stripped =
    report.strippedArticleFields.length > 0
      ? report.strippedArticleFields.join(", ")
      : "none — this key sees all article fields";
  const blocked =
    report.blockedFilterParams.length > 0
      ? report.blockedFilterParams.join(", ")
      : "none";
  const pagination = Object.entries(report.paginationAllowed)
    .map(([family, allowed]) => `${family}: ${allowed ? "allowed" : "page > 0 will 403"}`)
    .join("; ");
  const historicalNote = report.dateWindowLimits.historicalFloor
    ? `clamped to on/after ${report.dateWindowLimits.historicalFloor.toISOString()} (no HISTORICAL_NEWS)`
    : "no clamp (HISTORICAL_NEWS present)";
  const realTimeNote = report.dateWindowLimits.realTimeCeiling
    ? `capped to before ${report.dateWindowLimits.realTimeCeiling.toISOString()} (no REAL_TIME_NEWS)`
    : "no clamp (REAL_TIME_NEWS present)";

  return `\
# This key's entitlements

This resource is generated for the current session's API key. Re-read it after a 403 or an unexpectedly null/empty field.

## Article response fields always null for this key
${stripped}

## Article filter params that will 403 for this key
${blocked}

## Pagination (page > 0)
${pagination}

## Silent date-window clamps (HTTP 200, not an error)
- \`from\` on article search: ${historicalNote}
- \`to\` on article search: ${realTimeNote}

## Journalist email
${report.hasJournalistEmail ? "Visible for this key." : "Not visible for this key (JOURNALISTS_EMAIL scope missing)."}

## Decision tree for errors
- **403 "parameter is not supported by your plan"** — plan restriction, do not retry, tell the user which filter to drop.
- **403 quota exceeded** — do not retry; report remaining quota via \`get_api_access\`.
- **429** — rate limited; back off using the retry-after hint in the error message before retrying.
- **400 pagination limit** — reduce \`page\`/\`size\` rather than retrying unchanged.
`;
}
