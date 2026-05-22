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
6. \`${executeCodeTool.name}\` — run Python in a persistent Jupyter kernel. State persists between calls. Pre-installed: pandas, numpy, matplotlib, seaborn, scipy, scikit-learn, and more.
   - Read exported data: \`pd.read_json("${DATA_DIR}/<file>.jsonl", lines=True)\`
   - Charts: use simple matplotlib calls (plt.bar, plt.plot, plt.scatter, plt.pie, plt.boxplot). One plt.show() per chart. Charts render as interactive widgets in the UI.
   - Do NOT use subplots, annotations, fill_between, dual axes, or combine chart types — these break interactive parsing.
   - For complex visualizations that need subplots or annotations, save with plt.savefig() to ${OUTPUT_DIR}/ instead of plt.show().
   - No internet access in the sandbox except *.amazonaws.com.

### File Management
7. \`${shellTool.name}\` — run bash commands in the sandbox. Useful for installing packages, moving files, or quick shell operations.
8. \`${listFilesTool.name}\`, \`${readFileTool.name}\`, \`${writeFileTool.name}\`, \`${grepTool.name}\`, \`${strReplaceTool.name}\` — file read/write/search in the sandbox.

### Output
9. Save deliverables (reports, CSVs, charts) to ${OUTPUT_DIR}/ — files here appear in the user's Artifacts panel and are downloadable.

### Typical Workflow
\`${searchSignalsTool.name}\` → \`${readSignalTool.name}\` → \`${createWorkspaceTool.name}\` → \`${exportEventsTool.name}\` → \`${executeCodeTool.name}\` (load + analyze + chart)

### Common Mistakes to Avoid
- Calling \`${executeCodeTool.name}\` before \`${createWorkspaceTool.name}\`.
- Using \`${exportEventsTool.name}\` without first calling \`${readSignalTool.name}\` to understand the schema.
- Using \`plt.subplots()\` or combining chart types — make separate \`${executeCodeTool.name}\` calls instead.
- Inventing workspace IDs instead of using the one from \`${createWorkspaceTool.name}\`.
- Writing raw SQL — all data access goes through \`${exportEventsTool.name}\`.
`;
