/**
 * Long-form guidance moved out of `MCP_INSTRUCTIONS` and into on-demand MCP
 * resources. `MCP_INSTRUCTIONS` is a router — the behavior-changing
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
- \`spikeScore\` is relative (current vs. baseline rate); \`currentMentions\`/\`currentRatePerDay\` are absolute. \`normalizeByDay\` changes whether counts or per-day rates drive the comparison. Both windows are smoothed by +1 mention (\`smoothingAlpha\` default 1), so tiny counts still produce scores — one current mention with no baseline scores 2x on equal windows. Below about 1.1 is not a meaningful spike; always read the score alongside the mention counts.
- \`get_top_entities\` counts are raw mentions in a single window with no baseline — they measure how much an entity is covered, not whether its coverage is rising.
- \`score\` on an article is search relevance, not importance or quality.

## Articles and stories
- Reprints are deduplicated by default (\`showReprints=false\`); \`reprintGroupId\` links copies of the same wire story across outlets.
- A story (cluster) aggregates many articles: \`uniqueCount\`/\`totalCount\` are article counts, \`uniqueSourcesCount\` is the number of distinct publishers and \`sourceDiversity\` is \`uniqueSourcesCount / totalCount\` — high \`totalCount\` with low \`uniqueCount\` usually means syndication, not broad pickup.
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

## Ranking entities: most-mentioned vs. spiking
Two different questions, two different tool families:
- **Most mentioned** — "who is most covered / dominates coverage / has the most share of voice in X?" → \`get_top_entities\`. One window (\`from\`/\`to\`), raw mention counts, no baseline. Passing mentions count, so heads of state and celebrities often top topical queries; present the result as "most mentioned", never "trending". Also the only tool for cities, journalists, and sources.
- **Trending / surging / spiking** — "who is trending, suddenly in the news, or covered more than usual?" → \`get_top_people\` / \`get_top_companies\` (and \`get_top_topics\` when registered). Compares a current window against a baseline window.
- **Both** — "who is driving X coverage, and who is new?" → call both families with identical topic/category/q filters and report them as separate lists.

### Spike windows
- Current window = the user's period: today → last 1 day, this week → last 7 days, this month → last 30 days.
- "Surging right now" → baseline is an equal-length window immediately before the current one (1 day vs. the prior day, 7 vs. the prior 7, 30 vs. the prior 30). Set \`baselineTo\` = \`currentFrom\`.
- "Unusual compared with normal" → baseline 4–10x the current window's length (the default is 3 days vs. the preceding 27). Keep \`normalizeByDay=true\` so unequal lengths compare per day.
- **Never set \`from\`/\`to\` on the spike tools.** They filter every article before the windows are applied, so a \`from\` at the start of the current window empties the baseline and inflates every score.

### Spike thresholds
- **On the rise** (established entities gaining coverage): \`minBaseline=5\`.
- **Breaking / brand-new** names: \`minBaseline=0\` plus \`minCurrent\` ≈ 3 for a narrow topic over 1 day, ≈ 10 for broad or multi-day queries. This is a tunable heuristic: with +1 smoothing, one current mention and no baseline already scores 2x on a 1-day vs. 1-day comparison.
- Request \`size\` 25–50, then judge. Treat \`spike_score\` below about 1.1 as not trending, and always report \`current_mentions\` and \`baseline_mentions\` next to the score.
- Scope with \`topic\` (exact name from \`search_topics\`), \`category\`, or \`q\`. With no scope, results reflect all news.

### Perennially covered names (default: leave them out)
Heads of state, mega-celebrities, and dominant companies are mentioned in almost every topic. Unless the user signals otherwise, assume a request for trending, spiking, or breakout people, companies, or topics in a timeframe, topic, or query wants names whose coverage is new or unusual — not these perennial names.
- **Default procedure:**
  1. Query in breakout mode: equal-length baseline right before the current window, \`minBaseline=0\`, \`minCurrent\` ≈ 3–10. Perennial names rarely qualify here, because their baseline is high and their ratio stays near 1.
  2. Use about 1.5x instead of 1.1x as the trending cutoff.
  3. Drop entries whose \`baseline_mentions\` is far above the rest of the list (on a narrow topic, roughly 10+) and whose \`spike_score\` is under 2. These are covered steadily, not surging.
  4. Keep a perennial name only if it surged (about 2x or more) and the surge is about the topic — confirm with \`search_news_articles\` filtered to its ID plus the same \`q\`/\`topic\` over the current window. Label it as a well-known name with a genuine topic-specific surge.
  5. Briefly say what was left out and why (e.g. "left out Donald Trump: 1.2x, mentioned steadily in this coverage"), so the user can ask to include them.
- **Include perennial names (no filtering, standard 1.1x cutoff, \`minBaseline=5\` "on the rise" call as well) when the user signals it:** they name the entity ("is Trump trending in youth sports?"), ask for "all", "including well-known / major / established" names, or ask which big names or major players are gaining coverage.
- "Most mentioned" requests (\`get_top_entities\`) are unaffected — perennial names belong in those results.
- No tool parameter hides a specific entity from the ranking. Drop names from the returned list yourself; do not try to filter an entity out with article filters, which would discard every article that mentions it, including legitimate topic coverage.
- **Leftover noise is usually the query, not fame.** A phrase can match unrelated stories (e.g. "youth sports" matching "Ministry of Youth and Sports" politicians abroad). Tighten it with \`country\`/\`language\`, a narrower Boolean \`q\` (\`"youth sports" AND (league OR coach OR club)\`), or \`excludeCategory\`/\`excludeTopic\` for clearly off-topic coverage.

### Example mappings
- "Who's trending in AI this week?" → \`get_top_people\` + \`get_top_companies\`, \`topic=["AI"]\`, current = last 7 days, baseline = the 7 days before, \`minBaseline=0\`, \`minCurrent=5\`, perennial names filtered by default.
- "Which major AI companies are gaining coverage this week?" → \`get_top_companies\`, same windows, \`minBaseline=5\`, perennial names included.
- "Who's suddenly in the news about the Fed today?" → \`get_top_people\`, \`q="Federal Reserve"\`, current = last 1 day, baseline = the day before, \`minBaseline=0\`, \`minCurrent=3\`.
- "Which companies are getting more coverage than usual in EV news?" → \`get_top_companies\`, \`q="electric vehicles"\`, current = last 3–7 days, baseline = the preceding 30 days, \`minBaseline=5\`.
- "Most-covered EV companies last month" → \`get_top_entities\`, \`entity=["companies"]\`, \`q="electric vehicles"\`, \`from\` = 30 days ago.
- "Who's driving youth sports coverage, and who's new?" → \`get_top_entities\` (people) for most mentioned, plus \`get_top_people\` with \`minBaseline=0\`, \`minCurrent=3\` for newly surging names.

### Explaining a spike
Take the returned \`wikidataId\` / company \`id\` → \`search_news_articles\` over the current window filtered to that entity → \`summarize_news\` to explain the cause.

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
- **403 CREDITS_EXHAUSTED** — a credit plan is out of credits; do not retry any tool. Tell the user when credits reset (in the error, or via \`get_api_access\`) or to upgrade their plan. On credit plans each request costs credits by endpoint (\`get_api_access\` lists the rates), so prefer one well-filtered call over many broad ones.
- **429** — rate limited; back off using the retry-after hint in the error message before retrying.
- **400 pagination limit** — reduce \`page\`/\`size\` rather than retrying unchanged.
`;
}
