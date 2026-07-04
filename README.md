[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/goperigon-perigon-mcp-server-badge.png)](https://mseep.ai/app/goperigon-perigon-mcp-server)

<p align="center">
  <img src="https://marketing.perigon.io/_next/image?url=%2Flogos%2FLogo-Perigon-Dark.png&w=256&q=75" width="120" alt="Perigon logo" />
</p>

<h1 align="center">Perigon&nbsp;MCP&nbsp;Server</h1>

This is the official MCP server for the Perigon news API.

## Documentation

For more information on how to use and connect the MCP, visit the [MCP docs.](https://dev.perigon.io/docs/mcp)

## Maintainers
The Perigon MCP Server is developed and maintained by the Perigon engineering team.

Lead Developer: Islem Maboud, responsible for the architecture, implementation, and ongoing development of this MCP server, including the remote transport layer, authentication handling, deployment configuration, and the MCP playground.

## Usage

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
    "perigon_news_api": {
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
    "perigon_news_api": {
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
claude mcp add --transport http perigon_news_api https://mcp.perigon.io/v1/mcp \
  --header "Authorization: Bearer YOUR_PERIGON_API_KEY"
```

**SSE (legacy clients only):**
```json
{
  "mcpServers": {
    "perigon_news_api": {
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

By default all tools permitted by your API key are available. You can restrict a session to a smaller set by appending a `?tools=` query parameter to the server URL. This is useful for reducing context size and keeping the model focused.

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
    "perigon_news_api": {
      "url": "https://mcp.perigon.io/v1/mcp?tools=search_news_articles,search_news_stories",
      "type": "http",
      "headers": {
        "Authorization": "Bearer YOUR_PERIGON_API_KEY"
      }
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

The full list of available tools — including names, descriptions, and parameter schemas — is visible in the [MCP playground](https://mcp.perigon.io). The tools available to you depend on the scopes granted to your API key.

### Signal Insights tools

API keys with the **Signal Insights** scope unlock an additional set of tools for querying, exporting, and analyzing your AI signals data with a persistent Python sandbox.

#### Workspace pattern

Signal Insights tools use an explicit workspace handle (per [SEP-2567](https://modelcontextprotocol.io/seps/2567-sessionless-mcp)):

1. Call `create_insights_workspace` **once at the start of a conversation**.
2. Pass the returned workspace ID to every subsequent analysis tool call.
3. Files written in `execute_code` or `shell` persist across calls within the same workspace. Exported data is accessible at `/home/user/workspace/artifacts/` inside the sandbox.
4. If you resume a chat after a restart, the workspace UUID from the prior conversation is still valid — the sandbox kernel will be fresh but your exported S3 artifacts are preserved.

#### Signal Insights tool list

| Tool | Type | Description |
|------|------|-------------|
| `signal_insights_create_workspace` | Setup | Create a workspace for the conversation. Must be called first. |
| `signal_insights_search_signals` | Read | Search signals by name or monitoring objective. |
| `signal_insights_read_signal` | Read | Get signal metadata (schema, event types, counts). |
| `signal_insights_export_events` | Data | Export signal events to S3 with optional filters/aggregations. Returns a preview and file path. |
| `signal_insights_execute_code` | Sandbox | Execute Python in a persistent IPython kernel. pandas, numpy, matplotlib and more pre-installed. |
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
      "url": "https://mcp.perigon.io/v1/mcp?tools=signal_insights_create_workspace,signal_insights_search_signals,signal_insights_read_signal,signal_insights_export_events,signal_insights_execute_code,signal_insights_shell,signal_insights_list_files,signal_insights_read_file,signal_insights_write_file,signal_insights_grep,signal_insights_str_replace",
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

With no `?tools=` filter, all tools permitted by your API key's scopes are active.

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
