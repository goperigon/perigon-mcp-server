<p align="center">
  <img src="https://marketing.perigon.io/_next/image?url=%2Flogos%2FLogo-Perigon-Dark.png&w=256&q=75" width="120" alt="Perigon logo" />
</p>

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/mcp-banner-terminal-dark.png" />
  </picture>
</div>

<h1 align="center">The official Perigon MCP server.</h1>

## Documentation

For more information on how to use and connect the MCP, visit the [MCP docs.](https://dev.perigon.io/docs/mcp)

## Maintainers
The Perigon MCP Server is developed and maintained by the Perigon engineering team.

Lead Developer: Islem Maboud, responsible for the architecture, implementation, and ongoing development of this MCP server, including the remote transport layer, authentication handling, deployment configuration, and the MCP playground.

## Usage

### MCP Registry

The official MCP Registry name for this server is `io.github.goperigon/perigon-mcp-server`. [`server.json`](./server.json) is the source of truth for that listing. A published registry version is immutable, so any change to the listing requires bumping `version` in `server.json` and publishing again.

### Playground

You can try out the Perigon MCP server in our [playground](https://mcp.perigon.io).

> **Note:** A valid Perigon API key is required to use the MCP. The MCP playground requires you to be already authenticated to the [Perigon dashboard](https://perigon.io).

### Connecting

You can connect to our remote MCP server using any MCP-compatible client.

**Server URL:** `https://mcp.perigon.io`

The recommended transport is **Streamable HTTP** (`/v1/mcp`). SSE (`/v1/sse`) is supported for legacy clients but not recommended for new integrations.

#### Quick Setup Examples

**Streamable HTTP — native support (recommended):**
```json
{
  "mcpServers": {
    "perigon": {
      "url": "https://mcp.perigon.io/v1/mcp",
      "type": "http",
      "headers": {
        "Authorization": "Bearer YOUR_PERIGON_API_KEY"
      }
    }
  }
}
```

**Streamable HTTP — via `mcp-remote` (for clients without native HTTP support):**
```json
{
  "mcpServers": {
    "perigon": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://mcp.perigon.io/v1/mcp",
        "--header",
        "Authorization: Bearer ${PERIGON_API_KEY}"
      ],
      "env": {
        "PERIGON_API_KEY": "YOUR_PERIGON_API_KEY"
      }
    }
  }
}
```

**For Claude Code (CLI):**
```bash
claude mcp add --transport http perigon https://mcp.perigon.io/v1/mcp \
  --header "Authorization: Bearer YOUR_PERIGON_API_KEY"
```

**SSE (legacy clients only):**
```json
{
  "mcpServers": {
    "perigon": {
      "url": "https://mcp.perigon.io/v1/sse",
      "type": "sse",
      "headers": {
        "Authorization": "Bearer YOUR_PERIGON_API_KEY"
      }
    }
  }
}
```

📖 **For detailed setup instructions for different clients, see our [comprehensive MCP documentation](https://dev.perigon.io/docs/mcp).**

### Selecting specific tools

With no `?tools=` filter, a session gets `search_news_articles`, the five stats tools, the monitor read tools (including `set_monitor_status`), `get_api_access`, every Signal Insights tool, and the search tools your API key's scopes allow. Several large tools stay off that default and must be requested by name or profile: `create_monitor`, `update_monitor`, `get_source_by_id`, `get_top_topics`, `get_story_stats`, and the watchlist, source-group, contact-point, and article-refresh tools. You can also restrict a session to a smaller set with `?tools=`. This is useful for reducing context size and keeping the model focused.

```
https://mcp.perigon.io/v1/mcp?tools=search_news_articles,search_news_stories
```

- Pass a comma-separated list of tool names, or `all` to explicitly activate every permitted tool.
- Only tools your API key already has access to will be activated — the parameter cannot expand permissions.
- Omitting the parameter, passing an empty value, or passing `all` are all equivalent and activate every permitted tool.

**Example — Cursor config scoped to article and story search:**
```json
{
  "mcpServers": {
    "perigon": {
      "url": "https://mcp.perigon.io/v1/mcp?tools=search_news_articles,search_news_stories",
      "type": "http",
      "headers": {
        "Authorization": "Bearer YOUR_PERIGON_API_KEY"
      }
    }
  }
}
```

#### Named tool profiles

Instead of listing individual tool names, `?tools=` also accepts curated profile aliases — useful shorthand for reducing context to a task-appropriate subset:

| Profile | Includes |
|---------|----------|
| `research` | `search_news_articles`, `search_news_stories`, `search_story_history`, `search_vector_news`, `summarize_news`, journalists, sources, people, companies, topics, the five always-on stats tools, `get_top_topics`, `get_source_by_id`, and `get_api_access`. Wikipedia search and the company, person, and location shortcuts are not in this profile. |
| `monitoring` | All monitor tools (including `create_monitor`/`update_monitor`) plus every Signal Insights tool. |
| `platform` | Watchlists, source groups, contact points, article refresh status, and `get_api_access`. |
| `minimal` | `search_news_articles` plus the five stats tools and `get_api_access` — the smallest useful research set. |

Profiles can be combined with explicit tool names in the same `?tools=` value (e.g. `?tools=research,create_monitor`), and are always intersected with what your API key's scopes actually permit.

### Prompt Examples

When prompting your agent we recommend providing the current date (or a tool to get it) unless the agent already has access to such information, this is because some models like Claude will otherwise think the current date is their knowledge cutoff and they will retrieve outdated information frequently.

**News Articles & Stories:**
- Give me the top 5 political headlines in the United States from today.
- What business stories are trending in New York today?
- Show me the latest tech news from California this week.
- Find political news from swing states in the last 3 days.
- Show me cryptocurrency-related stories from the past week.

**Journalists & Sources:**
- Find local news sources in Texas.
- Who are the top business journalists at major publications?
- Find journalists covering renewable energy, then show me their recent articles.
- Which journalists write the most about climate policy?
- Show me articles from major financial publications today.

**People & Companies:**
- Find recent news about pharmaceutical company CEOs.
- Search for Tesla as a company, then find recent news stories about them.
- Show me companies in the electric vehicle industry.
- Search for politicians mentioned in healthcare stories.
- What are tech companies saying about AI regulation?

**Monitors:**
- List my active event monitors.
- Show me the latest events detected by my product recall monitor.
- Create a draft monitor for executive departures in the semiconductor industry.
- Pause my competitor mentions monitor.
- Show me the latest newsletter from my AI regulation topic monitor.

## Supported tools

The full list of available tools — including names, descriptions, and parameter schemas — is visible in the [MCP playground](https://mcp.perigon.io). Search tools other than `search_news_articles` appear only when the API key has the matching scope. Opt-in tools appear only when requested.

### Search tools

`search_news_articles` is always available. The rest of this list is registered only when the key has the corresponding scope.

| Tool | Description |
|------|-------------|
| `search_news_articles` | Keyword and filter search over individual articles from global sources, including Boolean queries. |
| `search_news_stories` | Clustered headlines that group related articles into one narrative. Requires the clusters scope. |
| `search_story_history` | Timestamped snapshots of how a story cluster changed. Requires the clusters scope. |
| `search_vector_news` | Semantic search over recent articles. Requires the news vector-search scope. |
| `summarize_news` | AI summary of articles matching a filter set, with citations. Requires the search-summary scope. |
| `search_journalists` | Journalist and reporter profiles. Requires the journalists scope. |
| `search_sources` | News publications and outlets. Requires the sources scope. |
| `search_people` | Public-figure profiles. Requires the people scope. |
| `search_companies` | Company profiles, including domain, ticker, and industry. Requires the companies scope. |
| `search_topics` | The Perigon topic taxonomy, for exact topic filters used by other tools. Requires the topics scope. |
| `search_wikipedia` | Keyword search of Wikipedia pages. Requires the Wikipedia scope. |
| `search_vector_wikipedia` | Semantic search of Wikipedia pages. Requires the Wikipedia vector-search scope. |

### Shortcut tools

These wrap a lookup plus a recent-article search. Each one is registered with the scope of the entity it looks up.

| Tool | Description |
|------|-------------|
| `get_company_news` | Recent articles about a company looked up by name. Requires the companies scope. |
| `get_person_news` | Recent articles about a person looked up by name. Requires the people scope. |
| `get_location_news` | Recent articles for a city, state, or country. Requires the locations scope. |

### Stats tools

The five stats tools are always available regardless of scope — the underlying `/v1/stats/*` endpoints perform no permission check beyond a valid key — and give aggregate metrics computed server-side, which is generally preferable to counting search results by hand.

| Tool | Description |
|------|-------------|
| `get_avg_sentiment` | Average sentiment (positive/negative/neutral) bucketed over time for articles matching a filter set. |
| `get_article_counts` | Article publication volume bucketed over time — pair with `get_avg_sentiment` on identical filters for a trend view. |
| `get_top_entities` | The most frequently mentioned topics, people, companies, cities, journalists, or sources. |
| `get_top_people` | People whose coverage is spiking relative to a baseline period. |
| `get_top_companies` | Companies whose coverage is spiking relative to a baseline period. |

### Entitlement tools

| Tool | Description |
|------|-------------|
| `get_api_access` | Always available. Reports this key's scopes, organization, usage quota, and the derived entitlement behavior (stripped fields, blocked filters, date-window clamps). Call once per session, or after a 403 or an unexpectedly null/empty field — does not count against request quota. |

### Monitor tools

The six read tools below are always available and expose the public `/v1/api/monitors` API for reading monitor configuration and output. `create_monitor` and `update_monitor` are not always-on — request them explicitly via `?tools=create_monitor,update_monitor` or the `monitoring` profile, since most sessions never call them and the shared monitor schema is large.

| Tool | Description |
|------|-------------|
| `list_monitors` | List and filter monitors by UUID, name, lifecycle status, or EVENT, MENTIONS, and TOPIC classification. |
| `get_monitor` | Retrieve a monitor's complete configuration, including its objective, query, output schema, schedule, watchlist, and contact points. |
| `get_monitor_events` | Retrieve structured events emitted by EVENT and MENTIONS monitors with extracted data, entities, summaries, and related articles. |
| `get_monitor_newsletters` | Retrieve scheduled human-readable briefings generated by monitors, typically for TOPIC monitors. |
| `get_monitor_summaries` | Retrieve rolling AI-generated monitor summary history. |
| `set_monitor_status` | Activate, pause, or archive a monitor. Archiving cannot be reversed through the public API. |
| `create_monitor` *(opt-in)* | Create a DRAFT or ACTIVE monitor with typed query, output schema, schedule, and delivery configuration. Defaults to DRAFT. |
| `update_monitor` *(opt-in)* | Partially update monitor configuration while preserving omitted fields. |

### Platform tools

Read-only by default; opt in via `?tools=` (by name or the `platform` profile).

| Tool | Description |
|------|-------------|
| `get_source_by_id` | Look up one news source by exact ID or domain for full detail (paywall status, alt names, location). |
| `get_top_topics` | Topics whose coverage is spiking relative to a baseline period. |
| `get_story_stats` | Story-level (clustered headline) publication volume or velocity over time. |
| `watchlists` | List, get by ID, or resolve by name your organization's watchlists of people and companies. |
| `source_groups` | List, get by ID, or resolve by name your organization's custom source-group bundles. |
| `contact_points` | List or get by UUID your organization's monitor notification delivery channels (email/webhook). |
| `article_refresh` | Check a background article-refresh job's status, or peek cached refresh data for up to 100 article IDs — read-only, cannot submit new jobs. |
| `create_watchlist` / `update_watchlist` | Create or partially update a watchlist. Only used when explicitly requested. |
| `create_source_group` / `update_source_group` | Create or partially update a custom source group. Only used when explicitly requested. |

### Research prompts

The server also registers six reusable MCP prompts that encode multi-step tool-chaining playbooks, so a host that surfaces prompts gets correct chaining without relying on the model to reconstruct it: `entity_deep_dive`, `narrative_trace`, `coverage_trend`, `journalist_beat_profile`, `competitive_landscape`, and `spike_explainer`.

### Reference resources

Long-form guidance is available on-demand as MCP resources rather than always-on instructions: `perigon://reference/fields` (response field semantics), `perigon://reference/chaining` (cross-endpoint research playbooks), `perigon://reference/entitlements` (this session's scope-to-behavior mapping), and `perigon://reference/charts` (Signal Insights chart formatting rules).

### Signal Insights tools

API keys with the **Signal Insights** scope unlock an additional set of tools for querying, exporting, and analyzing your AI signals data with a persistent Python sandbox.

#### Workspace pattern

Signal Insights tools use an explicit workspace handle (per [SEP-2567](https://modelcontextprotocol.io/seps/2567-sessionless-mcp)):

1. Call `signal_insights_create_workspace` **once at the start of a conversation**.
2. Pass the returned workspace ID to every subsequent analysis tool call.
3. Files written in `signal_insights_execute_code` or `signal_insights_shell` persist across calls within the same workspace. Exported data is accessible at `/home/user/workspace/artifacts/` inside the sandbox.
4. If you resume a chat after a restart, the workspace UUID from the prior conversation is still valid — the sandbox kernel will be fresh but your exported S3 artifacts are preserved.

#### Signal Insights tool list

| Tool | Type | Description |
|------|------|-------------|
| `signal_insights_create_workspace` | Setup | Create a workspace for the conversation. Must be called first for sandbox tools. |
| `signal_insights_search_signals` | Read | Search signals by name or objective; optional `classificationTypes` filter. |
| `signal_insights_read_signal` | Read | Get signal metadata (classification, schema or newsletter counts). |
| `signal_insights_list_newsletters` | Read | List newsletters for a TOPIC signal (title + excerpt). |
| `signal_insights_read_newsletter` | Read | Fetch full newsletter content as markdown. |
| `signal_insights_export_events` | Data | Export events to S3 (EVENT/MENTIONS only). Returns a preview and file path. |
| `signal_insights_execute_code` | Sandbox | Execute Python in a persistent IPython kernel. pandas, numpy, matplotlib and more pre-installed. |
| `signal_insights_preview_chart` | Sandbox | Render charts in the interactive chart viewer. |
| `signal_insights_shell` | Sandbox | Run bash commands in the sandbox. |
| `signal_insights_list_files` | Files | List files in the sandbox workspace. |
| `signal_insights_read_file` | Files | Read a file from the workspace. |
| `signal_insights_write_file` | Files | Write a file to the workspace. |
| `signal_insights_grep` | Files | Search file contents with a regex pattern. |
| `signal_insights_str_replace` | Files | Find and replace a string in a file. |

#### Example config — Signal Insights only

```json
{
  "mcpServers": {
    "perigon": {
      "url": "https://mcp.perigon.io/v1/mcp?tools=signal_insights_create_workspace,signal_insights_search_signals,signal_insights_read_signal,signal_insights_list_newsletters,signal_insights_read_newsletter,signal_insights_export_events,signal_insights_execute_code,signal_insights_preview_chart,signal_insights_shell,signal_insights_list_files,signal_insights_read_file,signal_insights_write_file,signal_insights_grep,signal_insights_str_replace",
      "type": "http",
      "headers": {
        "Authorization": "Bearer YOUR_PERIGON_API_KEY"
      }
    }
  }
}
```

#### Example config — Signal Insights combined with news tools

```json
{
  "mcpServers": {
    "perigon": {
      "url": "https://mcp.perigon.io/v1/mcp",
      "type": "http",
      "headers": {
        "Authorization": "Bearer YOUR_PERIGON_API_KEY"
      }
    }
  }
}
```

With no `?tools=` filter, Signal Insights tools are registered alongside the default news set described above. Opt-in monitor and platform tools stay out until requested.

## Issues / Contributing

### Issues

This MCP server is still in development as we determine what use cases our users want to
solve with this server. But if you have any special requests or features you would like to
see, don't hesitate to open a github issue on this Repo. We will gladly accept any feedback

### Contributing

This tool is intentionally open source so if you want to see some particular feature you
open an issue or open a PR and someone at Perigon will review it.

## Local development

We are using [bun](https://bun.sh/) for package mgmt.


### Environment Variables

Add the following environment variables to `.dev.vars`

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key (used for playground) |
| `PERIGON_API_KEY` | Perigon API key (used for playground) |
| `POKEY_SIGNAL_INSIGHTS_BASE_URL` | Internal Pokey service URL for Signal Insights MCP tools (e.g. `http://localhost:3001`). Required only when using Signal Insights tools. |

If you wish to contribute to the MCP playground (tools inspector & chat), please make sure to modify your network hosts file (/etc/hosts on mac) to include the following

```txt
127.0.0.1 local-mcp.perigon.io
```

This will allow perigon.io cookies to be available for you while doing local development.

```zsh
# install deps
bun i
# Runs the mcp server and the mcp playground
bun dev
```
