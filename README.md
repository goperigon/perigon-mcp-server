<p>
  <img src="https://marketing.perigon.io/_next/image?url=%2Flogos%2FLogo-Perigon-Dark.png&w=256&q=75" width="120" alt="Perigon logo" />
</p>

<h1>Perigon MCP</h1>

<h3>Perigon's hosted MCP server for real-time news, entities, and monitors.</h3>

<p>
  <a href="https://github.com/goperigon/perigon-mcp-server/actions/workflows/deploy.yml"><img src="https://img.shields.io/github/actions/workflow/status/goperigon/perigon-mcp-server/deploy.yml?branch=main&label=deploy" height="18" alt="Deploy status" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/goperigon/perigon-mcp-server" height="18" alt="License: Apache-2.0" /></a>
  <a href="#mcp-registry"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fregistry.modelcontextprotocol.io%2Fv0%2Fservers%2Fio.github.goperigon%252Fperigon-mcp-server%2Fversions%2Flatest&query=%24.server.version&label=MCP%20Registry&color=227C9D" height="18" alt="MCP Registry version" /></a>
  <a href="https://smithery.ai/server/goperigon/perigon-mcp-server"><img src="https://img.shields.io/badge/Smithery-listed-227C9D" height="18" alt="Listed on Smithery" /></a>
  <a href="#quick-start"><img src="https://img.shields.io/badge/transport-Streamable%20HTTP-227C9D" height="18" alt="Transport: Streamable HTTP" /></a>
  <a href="https://dev.perigon.io/docs/mcp"><img src="https://img.shields.io/badge/docs-dev.perigon.io-227C9D" height="18" alt="Documentation" /></a>
  <a href="https://mcp.perigon.io"><img src="https://img.shields.io/badge/try%20it-playground%20%E2%86%92-F9C035" height="18" alt="Try it in the playground" /></a>
</p>

- [**🚀 Quick start**](#quick-start)
- [**🔧 Choosing tools**](#choosing-tools)
- [**🛠️ Tools**](#tools)
- [**📚 Prompts and resources**](#prompts-and-resources)
- [**📊 Signal Insights workflow**](#signal-insights-workflow)
- [**💡 Prompting tips**](#prompting-tips)
- [**📦 MCP Registry**](#mcp-registry)
- [**💻 Local development**](#local-development)
- [**👥 Contributing and maintainers**](#contributing-and-maintainers)
- [**⚖️ License**](#license)

---

### Quick start

Endpoint: `https://mcp.perigon.io/v1/mcp`

Auth: `Authorization: Bearer <key>` — create a key at [perigon.io/dev/keys](https://perigon.io/dev/keys).

Try it in the [playground](https://mcp.perigon.io) (requires a signed-in [Perigon dashboard](https://perigon.io) session). Client-specific setup: [dev.perigon.io/docs/mcp](https://dev.perigon.io/docs/mcp).

**Native Streamable HTTP (recommended):**

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

**`mcp-remote` (clients without native HTTP):**

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

**Claude Code:**

```bash
claude mcp add --transport http perigon https://mcp.perigon.io/v1/mcp \
  --header "Authorization: Bearer YOUR_PERIGON_API_KEY"
```

SSE at `/v1/sse` exists for legacy clients. Use Streamable HTTP for new integrations.

---

### Choosing tools

Append `?tools=` to the MCP URL to limit the session. `?tool=` is an alias and wins if both are present.

```
https://mcp.perigon.io/v1/mcp?tools=search_news_articles,search_news_stories
https://mcp.perigon.io/v1/mcp?tools=research
https://mcp.perigon.io/v1/mcp?tools=research,create_monitor
```

- Comma-separated tool names, profile aliases, or a mix.
- The filter intersects with what the key's scopes already allow. It cannot expand access.
- Omit the parameter, pass an empty value, or pass `all` → default set (opt-in tools stay off).
- Unknown names are dropped. If every name is unknown, the default set is used.

| Profile | Tools |
|---------|-------|
| `research` | `search_news_articles`, `search_news_stories`, `search_story_history`, `search_vector_news`, `summarize_news`, `search_journalists`, `search_sources`, `search_people`, `search_companies`, `search_topics`, the five stats tools, `get_top_topics`, `get_source_by_id`, `get_api_access`. Not Wikipedia, and not the company / person / location shortcuts. |
| `monitoring` | All monitor tools (including `create_monitor` / `update_monitor`) plus every Signal Insights tool. |
| `platform` | `watchlists`, `create_watchlist`, `update_watchlist`, `source_groups`, `create_source_group`, `update_source_group`, `contact_points`, `article_refresh`, `get_api_access`. |
| `minimal` | `search_news_articles`, the five stats tools, `get_api_access`. |

`get_story_stats` is not in any profile. Request it by name.

Opt-in tools need no extra scope. Any valid key can request them.

---

### Tools

Availability:

- **Default** — registered when `?tools=` is omitted (and the key has the listed scope, if any).
- **Scope** — registered only when the key has that permission.
- **Opt-in** — omitted from the default set. Request by name or profile. Any valid key may use them.

#### Search

| Tool | Availability | Description |
|------|--------------|-------------|
| `search_news_articles` | Default | Keyword and filter search over individual articles, including Boolean queries. |
| `search_news_stories` | Scope: `CLUSTERS` | Clustered headlines that group related articles into one narrative. |
| `search_story_history` | Scope: `CLUSTERS` | Timestamped snapshots of how a story cluster changed. |
| `search_vector_news` | Scope: `VECTOR_SEARCH_NEWS` | Semantic search over recent articles. |
| `summarize_news` | Scope: `SEARCH_SUMMARY` | AI summary of matching articles, with citations. |
| `search_journalists` | Scope: `JOURNALISTS` | Journalist and reporter profiles. |
| `search_sources` | Scope: `SOURCES` | News publications and outlets. |
| `search_people` | Scope: `PEOPLE` | Public-figure profiles. |
| `search_companies` | Scope: `COMPANIES` | Company profiles (domain, ticker, industry). |
| `search_topics` | Scope: `TOPICS` | Perigon topic taxonomy for exact topic filters. |
| `search_wikipedia` | Scope: `WIKIPEDIA` | Keyword search of Wikipedia pages. |
| `search_vector_wikipedia` | Scope: `VECTOR_SEARCH_WIKIPEDIA` | Semantic search of Wikipedia pages. |

#### Shortcuts

Each tool looks up an entity, then searches recent articles about it.

| Tool | Availability | Description |
|------|--------------|-------------|
| `get_company_news` | Scope: `COMPANIES` | Recent articles about a company looked up by name. |
| `get_person_news` | Scope: `PEOPLE` | Recent articles about a person looked up by name. |
| `get_location_news` | Scope: `LOCATIONS` | Recent articles for a city, state, or country. |

#### Stats

Always on for any valid key. Prefer these over counting search results by hand.

| Tool | Availability | Description |
|------|--------------|-------------|
| `get_avg_sentiment` | Default | Average sentiment (positive / negative / neutral) bucketed over time. |
| `get_article_counts` | Default | Article publication volume bucketed over time. |
| `get_top_entities` | Default | Most-mentioned topics, people, companies, cities, journalists, or sources. |
| `get_top_people` | Default | People whose coverage is spiking versus a baseline. |
| `get_top_companies` | Default | Companies whose coverage is spiking versus a baseline. |

#### Access

| Tool | Availability | Description |
|------|--------------|-------------|
| `get_api_access` | Default | This key's scopes, organization, quota, and entitlement behavior. Does not count against request quota. Call once per session, or after a 403. |

#### Monitors

Read tools are default. Write tools are opt-in because the shared monitor schema is large.

| Tool | Availability | Description |
|------|--------------|-------------|
| `list_monitors` | Default | List and filter monitors by UUID, name, status, or EVENT / MENTIONS / TOPIC. |
| `get_monitor` | Default | Full monitor configuration. |
| `get_monitor_events` | Default | Structured events from EVENT and MENTIONS monitors. |
| `get_monitor_newsletters` | Default | Scheduled briefings, typically from TOPIC monitors. |
| `get_monitor_summaries` | Default | Rolling AI-generated monitor summary history. |
| `set_monitor_status` | Default | Activate, pause, or archive a monitor. Archiving cannot be reversed through the public API. |
| `create_monitor` | Opt-in | Create a DRAFT or ACTIVE monitor. Defaults to DRAFT. |
| `update_monitor` | Opt-in | Partial update; omitted fields are preserved. |

#### Platform

All of these are opt-in. `get_source_by_id` and `get_top_topics` are also in `research`. `get_story_stats` is name-only.

| Tool | Availability | Description |
|------|--------------|-------------|
| `get_source_by_id` | Opt-in | One news source by exact ID or domain. |
| `get_top_topics` | Opt-in | Topics whose coverage is spiking versus a baseline. |
| `get_story_stats` | Opt-in | Story-level publication volume or velocity over time. |
| `watchlists` | Opt-in | List, get, or resolve organization watchlists. |
| `create_watchlist` / `update_watchlist` | Opt-in | Create or partially update a watchlist. |
| `source_groups` | Opt-in | List, get, or resolve custom source-group bundles. |
| `create_source_group` / `update_source_group` | Opt-in | Create or partially update a source group. |
| `contact_points` | Opt-in | List or get monitor notification channels (email / webhook). |
| `article_refresh` | Opt-in | Check a refresh job or peek cached data for up to 100 article IDs. Read-only. |

#### Signal Insights

Registered for every session unless `?tools=` excludes them. The Insights API and Pokey backend reject calls when the key lacks Signal Insights access.

The `monitoring` profile includes this set. There is no Signal Insights-only profile; pass the tool names if you want only these.

| Tool | Availability | Description |
|------|--------------|-------------|
| `signal_insights_create_workspace` | Default | Create a workspace. Call once at the start of a conversation. |
| `signal_insights_search_signals` | Default | Search signals by name or objective. |
| `signal_insights_read_signal` | Default | Signal metadata (classification, schema or newsletter counts). |
| `signal_insights_list_newsletters` | Default | Newsletter titles and excerpts for a TOPIC signal. |
| `signal_insights_read_newsletter` | Default | Full newsletter content as markdown. |
| `signal_insights_export_events` | Default | Export EVENT / MENTIONS events to S3. Returns a preview and file path. |
| `signal_insights_execute_code` | Default | Python in a persistent IPython kernel (pandas, numpy, matplotlib). |
| `signal_insights_preview_chart` | Default | Render charts in the interactive chart viewer. |
| `signal_insights_shell` | Default | Bash in the sandbox. |
| `signal_insights_list_files` | Default | List files in the workspace. |
| `signal_insights_read_file` | Default | Read a workspace file. |
| `signal_insights_write_file` | Default | Write a workspace file. |
| `signal_insights_grep` | Default | Regex search over file contents. |
| `signal_insights_str_replace` | Default | Find and replace a string in a file. |

---

### Prompts and resources

Hosts that support MCP prompts can invoke these playbooks:

- `entity_deep_dive`
- `narrative_trace`
- `coverage_trend`
- `journalist_beat_profile`
- `competitive_landscape`
- `spike_explainer`

On-demand reference resources:

- `perigon://reference/fields` — response field semantics
- `perigon://reference/chaining` — cross-endpoint research playbooks
- `perigon://reference/entitlements` — this session's scope-to-behavior map
- `perigon://reference/charts` — Signal Insights chart formatting rules

MCP Apps viewers (registered when any Signal Insights tool is active):

- `ui://signal-insights/chart-viewer`
- `ui://signal-insights/export-viewer`

---

### Signal Insights workflow

1. Call `signal_insights_create_workspace` once at the start of a conversation.
2. Pass the returned workspace ID to every later analysis tool.
3. Files from `signal_insights_execute_code` and `signal_insights_shell` persist in that workspace. Exports land at `/home/user/workspace/artifacts/` inside the sandbox.
4. After a restart, the prior workspace UUID is still valid. The kernel is fresh; exported S3 artifacts remain.

---

### Prompting tips

Give the model the current date (or a date tool). Some models otherwise treat their knowledge cutoff as "today" and fetch stale news.

Examples:

- Top 5 political headlines in the United States from today.
- Latest tech news from California this week.
- Find journalists covering renewable energy, then show their recent articles.
- Search for Tesla, then find recent stories about them.
- List my active event monitors and show the latest events from one of them.
- Create a draft monitor for executive departures in semiconductors.

---

### MCP Registry

Registry name: `io.github.goperigon/perigon-mcp-server`.

[`server.json`](./server.json) is the source of truth. A published version is immutable. Bump `version` in `server.json` and republish after any listing change.

---

### Local development

This repo uses [Bun](https://bun.sh/). Put secrets in `.dev.vars`.

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Required for every route, including `/v1/mcp`. Also used by the playground chat. |
| `PERIGON_API_KEY` | Playground | Playground default key. |
| `POKEY_SIGNAL_INSIGHTS_BASE_URL` | No | Pokey base URL for Signal Insights. Defaults to `https://api.perigon.io/pokey` in Wrangler. Use `http://localhost:3001` to hit a local Pokey. |

To use Perigon dashboard cookies with the playground, add this to `/etc/hosts`:

```txt
127.0.0.1 local-mcp.perigon.io
```

```zsh
bun i
bun dev
bun test
```

`bun dev` serves the MCP worker and the playground.

---

### Contributing and maintainers

Open a GitHub issue or pull request for bugs, missing tools, or use cases. Someone at Perigon will review it.

Maintained by the Perigon team:

- Lead developer: Vasyl Teliman (feature development, security, server)
- Lead designer: Galen Rutledge (feature development, continued maintenance)
- Initial development: Islem Maboud (transport, auth, deploy, playground)

---

### License

[Apache-2.0](./LICENSE)
