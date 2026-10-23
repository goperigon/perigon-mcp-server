# Perigon OpenClaw Plugin

OpenClaw plugin for the [Perigon MCP server](https://perigon.io/docs/api/mcp) that provides news research, monitoring, and analysis tools.

## Features

- **Search & Research**: Search 200k+ news sources by keyword, sentiment, location, topic, and more
- **Entity Discovery**: Find journalists, publishers, companies, and people in the news
- **Coverage Analysis**: Track sentiment trends, article volume, and trending topics
- **News Monitoring**: Create monitors that extract structured events from matching news
- **Signal Insights**: Analyze monitor data with Python, pandas, matplotlib in a sandboxed environment

## Installation

### From ClawHub (when published)

```bash
openclaw plugins install clawhub:goperigon/openclaw-perigon
```

### From npm package

```bash
npm pack
openclaw plugins install npm-pack:./goperigon-openclaw-perigon-1.0.0.tgz
```

### From local development

```bash
cd marketplace/openclaw
npm install
npm run build
openclaw plugins install npm-pack:./goperigon-openclaw-perigon-1.0.0.tgz --force
```

## Configuration

### Option 1: OAuth (Recommended)

After installing the plugin, authenticate with Perigon OAuth:

```bash
openclaw mcp login perigon
```

This opens your browser to sign in with your Perigon account. Your organization's access and permissions apply automatically.

### Option 2: API Key

Get your API key from [perigon.io/dev/keys](https://perigon.io/dev/keys) and configure:

```bash
openclaw plugins configure perigon --api-key YOUR_API_KEY --use-oauth false
```

Or add to your OpenClaw config:

```json5
{
  plugins: {
    entries: {
      perigon: {
        enabled: true,
        config: {
          apiKey: "YOUR_PERIGON_API_KEY",
          useOAuth: false
        }
      }
    }
  }
}
```

For sensitive credentials, use environment variables or OpenClaw's secret management:

```json5
{
  plugins: {
    entries: {
      perigon: {
        config: {
          apiKey: {
            source: "env",
            provider: "default",
            id: "PERIGON_API_KEY"
          }
        }
      }
    }
  }
}
```

### Tool Filtering

Limit the tools exposed by the MCP server:

```json5
{
  plugins: {
    entries: {
      perigon: {
        config: {
          toolFilter: "research"  // or "all", "monitoring", or comma-separated tool names
        }
      }
    }
  }
}
```

Available profiles:
- `research` - Search, stats, and entity tools
- `monitoring` - Monitor and Signal Insights tools
- `platform` - Watchlists, source groups, contact points
- `minimal` - Just article search and stats
- `all` - Every available tool

## Verification

Check the plugin is loaded:

```bash
openclaw plugins list
openclaw plugins inspect perigon --runtime --json
```

Verify the MCP server connection:

```bash
openclaw mcp doctor perigon --probe
openclaw mcp status perigon --verbose
```

List available tools:

```bash
openclaw mcp probe perigon
```

## Usage Examples

Once configured, the Perigon tools are available in your OpenClaw sessions:

- "Find negative-sentiment coverage of electric vehicles from the past week"
- "Create a monitor for AI startups raising Series A funding"
- "Show me trending topics in tech news from the last 24 hours"
- "Find journalists covering renewable energy, then show their recent articles"
- "Analyze sentiment trends for Tesla over the past month"

## Available Tools

### Search (12 tools)
- `search_news_articles` - Search individual articles with filters
- `search_news_stories` - Clustered headlines grouping related coverage
- `search_story_history` - Track how a story evolved over time
- `search_vector_news` - Semantic search over recent news
- `summarize_news` - AI-powered summaries with citations
- `search_journalists` - Find journalist profiles
- `search_sources` - Search news publishers
- `search_people` - Public figure profiles
- `search_companies` - Company profiles and metadata
- `search_topics` - Browse topic taxonomy
- `search_wikipedia` - Keyword search Wikipedia
- `search_vector_wikipedia` - Semantic Wikipedia search

### Stats & Analytics (5 tools)
- `get_avg_sentiment` - Sentiment trends over time
- `get_article_counts` - Publication volume analysis
- `get_top_entities` - Most-mentioned topics, people, companies
- `get_top_people` - Trending people in the news
- `get_top_companies` - Trending companies

### Monitors (7 tools)
- `list_monitors` - List your monitors
- `get_monitor` - Get monitor configuration
- `get_monitor_events` - Retrieve extracted events
- `get_monitor_newsletters` - Get scheduled briefings
- `get_monitor_summaries` - AI-generated summaries
- `create_monitor` - Create a new monitor
- `update_monitor` - Update monitor settings
- `set_monitor_status` - Activate, pause, or archive

### Signal Insights (13 tools)
Python analysis workspace for monitor data:
- `signal_insights_create_workspace` - Initialize workspace
- `signal_insights_search_signals` - Find signals
- `signal_insights_read_signal` - Get signal metadata
- `signal_insights_list_newsletters` - List briefings
- `signal_insights_read_newsletter` - Read full newsletter
- `signal_insights_export_events` - Export events as data
- `signal_insights_execute_code` - Run Python analysis
- `signal_insights_preview_chart` - Render charts
- `signal_insights_shell` - Run shell commands
- File operations: list, read, write, grep, str_replace

### Platform & Utilities (11 tools)
- `get_api_access` - Check your permissions
- `get_company_news` - Quick company news lookup
- `get_person_news` - Quick person news lookup
- `get_location_news` - News by location
- `get_source_by_id` - Get source details
- `get_top_topics` - Trending topics
- `get_story_stats` - Story-level statistics
- Watchlists: list, create, update
- Source groups: list, create, update
- `contact_points` - List notification channels
- `article_refresh` - Check article refresh status

## Publishing to ClawHub

### Preparation

1. Build the package:

```bash
cd marketplace/openclaw
npm install
npm run build
```

2. Verify the package contents:

```bash
npm pack --dry-run
```

Should include:
- `dist/` (compiled TypeScript)
- `assets/` (icon.png, activity.svg)
- `openclaw.plugin.json`
- `package.json`

3. Test local installation:

```bash
npm pack
openclaw plugins install npm-pack:./goperigon-openclaw-perigon-1.0.0.tgz --force
openclaw plugins inspect perigon --runtime --json
openclaw mcp doctor perigon --probe
```

### Publishing

Install and authenticate with ClawHub CLI:

```bash
npm i -g clawhub
clawhub login
```

Dry run to validate:

```bash
clawhub package publish goperigon/openclaw-perigon --dry-run
```

Publish to ClawHub:

```bash
clawhub package publish goperigon/openclaw-perigon
```

After publishing, users can install with:

```bash
openclaw plugins install clawhub:goperigon/openclaw-perigon
```

## Architecture

This plugin uses OpenClaw's native MCP server support. The `mcpServers` field in `openclaw.plugin.json` declares the remote Perigon MCP endpoint, and OpenClaw's built-in MCP client handles:

- Server connection and discovery
- Tool registration and lifecycle
- OAuth authentication flow
- Request routing and error handling

No bridging or proxying is needed - the tools are exposed directly through OpenClaw's MCP runtime.

## Support

- Documentation: [perigon.io/docs/api/mcp](https://perigon.io/docs/api/mcp)
- Issues: [GitHub Issues](https://github.com/goperigon/perigon-mcp-server/issues)
- Contact: [perigon.io/contact](https://perigon.io/contact)

## License

Apache-2.0 - See [LICENSE](../../LICENSE) in the repository root.
