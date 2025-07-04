<p align="center">
  <img src="https://goperigon.com/favicon.ico" width="120" alt="Perigon logo" />
</p>

<h1 align="center">Perigon&nbsp;MCP&nbsp;Server</h1>

This is the official MCP server for the Perigon news API.

## Usage

### Playground

You can try out the Perigon MCP server in our [playground](https://mcp.perigon.io).

### Connecting

You can connect to our remote MCP server using local or remote MCP clients.
We support both `SSE` and `Streamable HTTP`.

You can simply add the following JSON to your MCP config for your application. **Don't forget to update `PERIGON_API_KEY` to
have your apiKey**.

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
        "PERIGON_API_KEY": "..."
      },
    }
  }
}
```

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
| `search_news_articles` | Search across news articles with various filters including location, time range, sources, and more |
| `search_news_stories` | Search across news stories / headlines to get ideas about big picture events |
| `search_journalists` | Search across journalists with various filters including location, time range, sources, and more |
| `search_sources` | Search across news sources with various filters including location, time range, and more |
| `search_people` | Search across people with various filters |
| `search_companies` | Search across companies with various filters |
| `search_topics` | Search topics in perigon database |

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
