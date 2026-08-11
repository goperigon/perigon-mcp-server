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

export { WORKSPACE_DIR, DATA_DIR, OUTPUT_DIR };

export const MCP_INSTRUCTIONS = `\
Perigon is a news intelligence API with three tool groups: News Search, Monitors, and Signal Insights.

## News Search

Search and filter news articles, stories, journalists, and sources from 200k+ global publications. No setup required.

Tools:
- \`${newsArticlesTool.name}\` — primary search. Supports Boolean queries (AND, OR, NOT), exact phrases, wildcards, filters by category/topic/source/sentiment/location/company/person.
- \`${newsStoriesTool.name}\` — search clustered headlines that group related articles across sources.
- \`${storyHistoryTool.name}\` — track how a news story evolved over time.
- \`${locationNewsTool.name}\` — shortcut for "what's happening in [city/state/country]?"
- \`${journalistsTool.name}\` — find journalists by name, beat, or publication.
- \`${sourcesTool.name}\` — find news sources/publishers by name or domain.
- \`${topicsTool.name}\` — browse the Perigon topic taxonomy.
- \`${peopleTool.name}\` / \`${personNewsTool.name}\` — find people entities and their news coverage.
- \`${companiesTool.name}\` / \`${companyNewsTool.name}\` — find companies and their news coverage.
- \`${wikipediaTool.name}\` / \`${wikipediaVectorTool.name}\` — search Wikipedia for background context.
- \`${newsVectorTool.name}\` — semantic/vector search over recent news articles.
- \`${summarizeTool.name}\` — get an AI-generated summary of news on a topic.

Tips:
- Default country filter is US. Set countries to [] or other codes for international coverage.
- Use sourceGroup (top10, top25, top100) for quality-filtered results from major outlets.
- Use showReprints=false (default) to deduplicate wire-service copies.
- \`${newsStoriesTool.name}\` returns clustered headlines — use this when the user wants "top stories" or "what happened with X" rather than individual articles.
- For "what's happening in [place]?" use ${locationNewsTool.name} for simplicity, or ${newsArticlesTool.name} with city/state/country filters for more control.

## Monitors

Create, configure, and read output from Perigon monitors via the public \`/v1/api/monitors\` API. Monitor tools are always available and do not require a sandbox workspace.

Tools:
- \`${listMonitorsTool.name}\` / \`${getMonitorTool.name}\` — discover monitors and inspect their complete configuration before reading output or making changes.
- \`${getMonitorEventsTool.name}\` — structured EVENT or MENTIONS output with extracted schema data, summaries, entities, and related articles.
- \`${getMonitorNewslettersTool.name}\` — scheduled TOPIC briefings with markdown content and citations.
- \`${getMonitorSummariesTool.name}\` — rolling AI-generated summary history.
- \`${createMonitorTool.name}\` / \`${updateMonitorTool.name}\` / \`${setMonitorStatusTool.name}\` — lifecycle and configuration management. Only mutate a monitor when the user explicitly requests it. Create monitors as DRAFT unless the user explicitly asks to activate them, and warn that ARCHIVED cannot be reversed through the public API.

Tips:
- Use \`${listMonitorsTool.name}\` first to discover monitor UUIDs.
- EVENT and MENTIONS monitors emit structured events; TOPIC monitors emit scheduled newsletters.
- \`${updateMonitorTool.name}\` replaces query, schema, entity groups, and contact points wholesale when those fields are provided.

## Signal Insights

Analyze Perigon monitoring signals. Requires a workspace for sandbox tools (export, code, charts).

### What are signals?
Signals monitor news media against a user-defined goal. Classification types:

| Type | Output | Data tools |
|------|--------|------------|
| EVENT | Structured realtime events with a user-defined schema | \`${readSignalTool.name}\` → \`${exportEventsTool.name}\` |
| MENTIONS | Structured mention events | same as EVENT |
| TOPIC | Scheduled briefings / newsletters (prose) | \`${readSignalTool.name}\` → \`${listNewslettersTool.name}\` → \`${readNewsletterTool.name}\` |

Do not confuse signal classification TOPIC with \`${topicsTool.name}\` (Perigon news taxonomy).

### Setup (required once per conversation for sandbox tools)
1. Call \`${createWorkspaceTool.name}\` — returns a workspace ID needed by export/code/file tools.
2. NEVER invent workspace IDs. Always use the one returned by \`${createWorkspaceTool.name}\`.

### Discovery
3. \`${searchSignalsTool.name}\` — find signals by name or objective. Optional \`classificationTypes\` filter (EVENT, MENTIONS, TOPIC). Omit query to list all.
4. \`${readSignalTool.name}\` — metadata including classificationType and type-specific fields (schema for EVENT/MENTIONS; newsletterCount for TOPIC).

### EVENT / MENTIONS data
5. \`${exportEventsTool.name}\` — structured query API (not SQL). EVENT/MENTIONS only — TOPIC UUIDs will error. Results saved as JSONL at ${DATA_DIR}/.
   - Start with aggregations (COUNT, date_trunc) to understand data shape before fetching raw records.
   - For complex analysis, fetch raw data first, then use \`${executeCodeTool.name}\` with pandas.

### TOPIC (briefing) data
6. \`${listNewslettersTool.name}\` — titles + excerpts for a TOPIC signal.
7. \`${readNewsletterTool.name}\` — full newsletter as markdown. Use for context or further analysis (including sandbox if useful).

### Analysis & Visualization
8. \`${executeCodeTool.name}\` — run Python for data prep and analysis in a persistent Jupyter kernel. State persists between calls. Pre-installed: pandas, numpy, matplotlib, seaborn, scipy, scikit-learn, openpyxl, jinja2.
   - Read exported data: \`pd.read_json("${DATA_DIR}/<file>.jsonl", lines=True)\`
   - The kernel is persistent — ALL state carries across calls: variables, imports, DataFrames, functions. Import once, reuse everywhere.
   - Charts produced here are NOT shown to the user. To display a chart, use \`${previewChartTool.name}\`.
   - No internet access in the sandbox except *.amazonaws.com.
9. \`${previewChartTool.name}\` — render a chart to the user. This is the ONLY tool that drives the interactive chart viewer. It shares the same kernel/state as \`${executeCodeTool.name}\`, so do analysis there and pass only the plotting code here.

#### Chart Rules (CRITICAL)

Charts rendered via \`${previewChartTool.name}\` are automatically parsed into interactive widgets in the chat UI. The parser only supports: line, scatter, bar, pie, box_and_whisker.

To ensure charts render interactively:
   - Always use \`${previewChartTool.name}\` (not \`${executeCodeTool.name}\`) for any chart you want the user to see.
   - Use ONLY simple matplotlib calls: plt.plot() (line), plt.scatter(), plt.bar()/plt.barh(), plt.pie(), plt.boxplot().
   - Call plt.show() at the end of EACH chart. One chart per plt.show() call.
   - Do NOT combine multiple chart types in one figure (no fill_between + plot, no twin axes).
   - Do NOT use plt.subplots() with multiple axes — create separate \`${previewChartTool.name}\` calls instead, each with its own plt.figure() and plt.show().
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

### File Management
10. \`${shellTool.name}\` — run bash commands in the sandbox. Useful for installing packages, moving files, or quick shell operations.
11. \`${listFilesTool.name}\`, \`${readFileTool.name}\`, \`${writeFileTool.name}\`, \`${grepTool.name}\`, \`${strReplaceTool.name}\` — file read/write/search in the sandbox.

### Output
12. Save deliverables (reports, CSVs, charts) to ${OUTPUT_DIR}/ — files here appear in the user's Artifacts panel and are downloadable.

### Typical Workflows
- Events: \`${searchSignalsTool.name}\` → \`${readSignalTool.name}\` → \`${createWorkspaceTool.name}\` → \`${exportEventsTool.name}\` → \`${executeCodeTool.name}\` → \`${previewChartTool.name}\`
- Briefings: \`${searchSignalsTool.name}\` (classificationTypes: TOPIC) → \`${readSignalTool.name}\` → \`${listNewslettersTool.name}\` → \`${readNewsletterTool.name}\`

### Common Mistakes to Avoid
- Calling \`${executeCodeTool.name}\` before \`${createWorkspaceTool.name}\`.
- Using \`${exportEventsTool.name}\` on TOPIC signals — use newsletter tools instead.
- Using \`${listNewslettersTool.name}\` on EVENT/MENTIONS signals.
- Using \`${exportEventsTool.name}\` without first calling \`${readSignalTool.name}\` to understand the schema.
- Using \`${executeCodeTool.name}\` to render charts — charts are only shown to the user via \`${previewChartTool.name}\`.
- Using \`plt.subplots()\` or combining chart types — make separate \`${previewChartTool.name}\` calls instead.
- Inventing workspace IDs instead of using the one from \`${createWorkspaceTool.name}\`.
- Writing raw SQL — event data access goes through \`${exportEventsTool.name}\`.
`;
