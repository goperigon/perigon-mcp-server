<p align="center">
  <img src="https://goperigon.com/favicon.ico" width="120" alt="Perigon logo" />
</p>

<h1 align="center">Perigon&nbsp;MCP&nbsp;Server</h1>

This is the official MCP server for the Perigon news API.

## Documentation

For more information on how to use and connect the MCP, visit the [MCP docs.](https://dev.perigon.io/docs/mcp#claude-desktop-1)

## Usage

### Playground

You can try out the Perigon MCP server in our [playground](https://mcp.perigon.io).

> **Note:** A valid Perigon API key is required to use the MCP. The MCP playground requires you to be already authenticated to the [Perigon dashboard](https://perigon.io).

### Connecting

You can connect to our remote MCP server using local or remote MCP clients.

**Server URL:** `https://mcp.perigon.io`

**Supported Connection Types:**
- **HTTP (Streamable):** `https://mcp.perigon.io/v1/mcp`
- **Server-Sent Events (SSE):** `https://mcp.perigon.io/v1/sse`

#### Quick Setup Examples

**For Claude Code (CLI):**
```bash
claude mcp add --transport sse perigon_news_api https://mcp.perigon.io/v1/sse \
  --header "Authorization: Bearer YOUR_PERIGON_API_KEY"
```

**For other MCP clients (SSE with mcp-remote):**
```json
{
  "mcpServers": {
    "perigon_news_api": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://mcp.perigon.io/v1/sse",
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

**For clients supporting HTTP (Streamable):**
```json
{
  "mcpServers": {
    "perigon_news_api": {
      "url": "https://mcp.perigon.io/v1/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_PERIGON_API_KEY"
      }
    }
  }
}
```

📖 **For detailed setup instructions for different clients, see our [comprehensive MCP documentation](./MCP_DOCUMENTATION.md).**

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


## Supported tools

| Tool | Description |
|------|-------------|
| `search_news_articles` | Search individual news articles with advanced filtering by keywords, location, time range, sources, and journalists. Returns full article content or summaries with metadata. |
| `search_news_stories` | Search clustered news stories and headlines. Returns story summaries, sentiment analysis, and metadata for understanding major news events and trends across multiple sources. |
| `search_journalists` | Find journalists and reporters by name, publication, location, or coverage area. Returns journalist profiles with their top sources, locations, and monthly posting activity. |
| `search_sources` | Discover news publications and media outlets by name, domain, location, or audience size. Returns source details including monthly visits, top topics, and geographic focus. |
| `search_people` | Search for public figures, politicians, celebrities, and newsworthy individuals. Returns biographical information including occupation, position, and detailed descriptions. |
| `search_companies` | Find corporations and businesses by name, domain, or industry. Returns company profiles with CEO information, employee count, industry classification, and business descriptions. |
| `search_topics` | Search topics currently supported via Perigon API for discovering available news categories and subjects. |
| `search_wikipedia` | Search Wikipedia pages for information on any topic. Returns page summaries, content, categories, and metadata with support for advanced filtering by Wikidata entities, categories, and page views. |
| `search_vector_wikipedia` | Search Wikipedia pages using semantic vector search for more contextual and meaning-based results. Returns page summaries, content, categories, and metadata. |

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

```zsh
# install deps
bun i
# Runs the mcp server and the mcp playground
bun dev
```
