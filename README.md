<p align="center">
  <img src="https://goperigon.com/favicon.ico" width="120" alt="Perigon logo" />
</p>

<h1 align="center">Perigon&nbsp;MCP&nbsp;Server</h1>
<p align="center">Official MCP Server for the <strong>Perigon&nbsp;API</strong></p>


## Usage

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


## Local Development

We are using bun for package mgmt.

```zsh
bun i

# Runs the mcp server and the mcp inspector
bun start
```
