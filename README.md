<p align="center">
  <img src="https://goperigon.com/favicon.ico" width="120" alt="Perigon logo" />
</p>

<h1 align="center">Perigon&nbsp;MCP&nbsp;Server</h1>

This is the official MCP server for the Perigon news API.

## Usage

### Connecting

You can connect to our remote MCP server using local MCP clients, by using the mcp-remote proxy.

You can simply add the following JSON to your MCP config for your application. **Don't forget to update `PERIGON_API_KEY` to
have your apiKey**.

```json
{
  "mcpServers": {
    "perigon_news_api": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.perigon.io/v1/sse",
        "--header",
        "Authorization: Bearer ${PERIGON_API_KEY}"
      ],
      "env": {
        "PERIGON_API_KEY": "..."
      }
    }
  }
}
```

### Prompt Examples

When prompting your agent we recommend providing the current date (or a tool to get it) unless the agent already has
access to such information, this is because some models like Claude will otherwise think the current date is their knowledge
cutoff and they will retrieve outdated information frequently.

- Give me the top headlines in the United States today.
- What is happening in Ireland today?
- Give me top stories this past week in North American countries.


## Supported tools

| Tool | Description |
|------|-------------|
| `get_top_headlines` | Fetches trending news stories by country, category, and timeframe |
| `read_news_articles` | Searches news articles with flexible query options and filtering |

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

```zsh
bun i

# Runs the mcp server and the mcp inspector
bun start
```
