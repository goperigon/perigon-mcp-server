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
import { exportEventsTool } from "./tools/signals/export-events";
import { executeCodeTool } from "./tools/signals/execute-code";
import { previewChartTool } from "./tools/signals/preview-chart";
import { shellTool } from "./tools/signals/shell";
import { listFilesTool } from "./tools/signals/list-files";
import { grepTool } from "./tools/signals/grep";
import { readFileTool } from "./tools/signals/read-file";
import { writeFileTool } from "./tools/signals/write-file";
import { strReplaceTool } from "./tools/signals/str-replace";
import { WORKSPACE_DIR, DATA_DIR, OUTPUT_DIR } from "./constants";

export { WORKSPACE_DIR, DATA_DIR, OUTPUT_DIR };

export const MCP_INSTRUCTIONS = `\
Perigon is a news intelligence API with two tool groups: News Search and Signal Insights.

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

## Signal Insights

Analyze structured event data from Perigon's monitoring signals (funding rounds, layoffs, M&A, product launches, cybersecurity incidents, etc.). Requires a workspace.

### What are signals?
Signals are a way to monitor news media. Users can define arbitrary monitoring goals, and Perigon's processing pipeline uses them to produce a realtime stream of events, derived from news data and other sources.
Each event in the stream has a structured schema, defined by the user.

### Setup (required once per conversation)
1. Call \`${createWorkspaceTool.name}\` — returns a workspace ID needed by all subsequent tools.
2. NEVER invent workspace IDs. Always use the one returned by \`${createWorkspaceTool.name}\`.

### Discovery
3. \`${searchSignalsTool.name}\` — find signals by name or objective. Omit query to list all.
4. \`${readSignalTool.name}\` — get a signal's full metadata, data schema, event types, and count. Always call this before \`${exportEventsTool.name}\` to understand available fields.

### Data Export
5. \`${exportEventsTool.name}\` — structured query API (not SQL). Specify signals, fields, filters, aggregations, ordering. Results are saved as JSONL files in the sandbox at ${DATA_DIR}/.
   - Start with aggregations (COUNT, date_trunc) to understand data shape before fetching raw records.
   - For complex analysis (window functions, pivots, joins across signals), fetch raw data first, then use \`${executeCodeTool.name}\` with pandas.

### Analysis & Visualization
6. \`${executeCodeTool.name}\` — run Python for data prep and analysis in a persistent Jupyter kernel. State persists between calls. Pre-installed: pandas, numpy, matplotlib, seaborn, scipy, scikit-learn, openpyxl, jinja2.
   - Read exported data: \`pd.read_json("${DATA_DIR}/<file>.jsonl", lines=True)\`
   - The kernel is persistent — ALL state carries across calls: variables, imports, DataFrames, functions. Import once, reuse everywhere.
   - Charts produced here are NOT shown to the user. To display a chart, use \`${previewChartTool.name}\`.
   - No internet access in the sandbox except *.amazonaws.com.
7. \`${previewChartTool.name}\` — render a chart to the user. This is the ONLY tool that drives the interactive chart viewer. It shares the same kernel/state as \`${executeCodeTool.name}\`, so do analysis there and pass only the plotting code here.

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
   - Use seaborn's simple wrappers (sns.lineplot, sns.barplot, sns.scatterplot, sns.boxplot) — they produce parseable output.
   - NEVER use plotly, bokeh, altair, or write charts to HTML files.
   - NEVER call plt.savefig() for charts you want displayed inline.
   - If a complex visualization is truly needed (annotations, dual axes, heatmaps, etc.), you can render it and it will display correctly as a PNG. But **always** prefer interactive simpler charts.
   - **Always** render charts on a light background.

### File Management
8. \`${shellTool.name}\` — run bash commands in the sandbox. Useful for installing packages, moving files, or quick shell operations.
9. \`${listFilesTool.name}\`, \`${readFileTool.name}\`, \`${writeFileTool.name}\`, \`${grepTool.name}\`, \`${strReplaceTool.name}\` — file read/write/search in the sandbox.

### Output
10. Save deliverables (reports, CSVs, charts) to ${OUTPUT_DIR}/ — files here appear in the user's Artifacts panel and are downloadable.

### Typical Workflow
\`${searchSignalsTool.name}\` → \`${readSignalTool.name}\` → \`${createWorkspaceTool.name}\` → \`${exportEventsTool.name}\` → \`${executeCodeTool.name}\` (load + analyze) → \`${previewChartTool.name}\` (display charts)

### Common Mistakes to Avoid
- Calling \`${executeCodeTool.name}\` before \`${createWorkspaceTool.name}\`.
- Using \`${exportEventsTool.name}\` without first calling \`${readSignalTool.name}\` to understand the schema.
- Using \`${executeCodeTool.name}\` to render charts — charts are only shown to the user via \`${previewChartTool.name}\`.
- Using \`plt.subplots()\` or combining chart types — make separate \`${previewChartTool.name}\` calls instead.
- Inventing workspace IDs instead of using the one from \`${createWorkspaceTool.name}\`.
- Writing raw SQL — all data access goes through \`${exportEventsTool.name}\`.
`;
