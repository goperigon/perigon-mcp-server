# OpenClaw Plugin Creation Summary

## Objective
Create a publishable OpenClaw plugin for ClawHub that exposes the Perigon MCP server tools inside OpenClaw.

## Approach Chosen: Native MCP Server Support ✅

**Decision**: Use OpenClaw's built-in MCP client via the `mcpServers` manifest field.

**Why this approach**:
1. OpenClaw has first-class MCP protocol support built into its core
2. The `mcpServers` field in `openclaw.plugin.json` is designed exactly for this use case
3. No bridging or proxying needed - OpenClaw's MCP client handles everything
4. Tools automatically appear in OpenClaw's catalog
5. Users get native OpenClaw MCP features (login, doctor, probe, status)
6. Cleaner architecture than implementing a custom SDK bridge

**Alternative considered**: Bridge via @modelcontextprotocol/sdk StreamableHTTP client
- Would require implementing our own MCP protocol handling
- Would duplicate functionality OpenClaw already provides
- More code to maintain and potential for bugs
- Not recommended by OpenClaw documentation for this use case

## Package Details

**Package Name**: `@goperigon/openclaw-perigon`
**Version**: 1.0.0
**License**: Apache-2.0
**Category**: Research
**Package Size**: 20.8 KB (packed), 33.2 KB (unpacked)

## Files Added

### Core Package Files
1. **marketplace/openclaw/package.json** (1.4 KB)
   - npm package metadata with OpenClaw compatibility flags
   - Peer dependency: `openclaw >=2026.3.24-beta.2`
   - Build script: TypeScript compilation
   - Files: dist, assets, openclaw.plugin.json

2. **marketplace/openclaw/openclaw.plugin.json** (4.9 KB)
   - Plugin manifest with id, name, description, category
   - Complete tool contract listing (55 tools)
   - MCP server definition pointing to `https://mcp.perigon.io/v1/mcp`
   - OAuth configuration (per-requester identity)
   - Config schema for API key and tool filtering
   - UI hints for Settings presentation
   - Catalog metadata (descriptions, URLs, privacy/terms)

3. **marketplace/openclaw/src/index.ts** (698 B compiled)
   - Plugin entry point using `definePluginEntry`
   - Minimal implementation (MCP server handled by manifest)
   - Comments explaining the architecture

4. **marketplace/openclaw/tsconfig.json**
   - TypeScript configuration targeting ES2021
   - ESNext modules with bundler resolution
   - Strict type checking enabled

5. **marketplace/openclaw/README.md** (7.6 KB)
   - Installation instructions (ClawHub, npm, local dev)
   - OAuth and API key configuration
   - Tool filtering examples
   - Complete tool catalog with descriptions
   - Verification commands
   - Publishing instructions
   - Architecture explanation

### Assets
6. **marketplace/openclaw/assets/icon.png** (17.9 KB)
   - Copied from existing marketplace/perigon/assets/icon.png
   - Used for plugin identity in catalogs and settings

7. **marketplace/openclaw/assets/activity.svg** (336 B)
   - Monochrome document/news icon
   - 16x16 optimized for compact tool calls in chat

### Generated Files (not committed)
- **dist/index.js** - Compiled JavaScript
- **dist/index.d.ts** - TypeScript declarations
- **goperigon-openclaw-perigon-1.0.0.tgz** - npm package tarball

## MCP Server Configuration

**Remote MCP URL**: `https://mcp.perigon.io/v1/mcp`

**Transport**: Streamable HTTP

**Authentication Schemes**:
1. **OAuth** (recommended):
   - Per-requester identity isolation
   - Discovery endpoint: `https://mcp.perigon.io/.well-known/oauth-protected-resource`
   - PKCE required
   - User command: `openclaw mcp login perigon`

2. **API Key**:
   - Bearer token in Authorization header
   - Get from: https://perigon.io/dev/keys
   - Configure via plugin config or environment variable

**Timeouts**:
- Connection: 5000ms
- Request: 30000ms

## Tool List (55 tools)

### Search Tools (12)
- search_news_articles
- search_news_stories
- search_story_history
- search_vector_news
- summarize_news
- search_journalists
- search_sources
- search_people
- search_companies
- search_topics
- search_wikipedia
- search_vector_wikipedia

### Stats & Analytics Tools (5)
- get_avg_sentiment
- get_article_counts
- get_top_entities
- get_top_people
- get_top_companies

### Use-case Shortcuts (3)
- get_company_news
- get_person_news
- get_location_news

### Monitor Tools (7)
- list_monitors
- get_monitor
- get_monitor_events
- get_monitor_newsletters
- get_monitor_summaries
- create_monitor
- update_monitor
- set_monitor_status

### Platform Tools (11)
- get_api_access
- get_source_by_id
- get_top_topics
- get_story_stats
- watchlists
- create_watchlist
- update_watchlist
- source_groups
- create_source_group
- update_source_group
- contact_points
- article_refresh

### Signal Insights Tools (13)
- signal_insights_create_workspace
- signal_insights_search_signals
- signal_insights_read_signal
- signal_insights_list_newsletters
- signal_insights_read_newsletter
- signal_insights_export_events
- signal_insights_execute_code
- signal_insights_preview_chart
- signal_insights_shell
- signal_insights_list_files
- signal_insights_read_file
- signal_insights_write_file
- signal_insights_grep
- signal_insights_str_replace

## Verification Results

### Build Verification ✅
```bash
cd marketplace/openclaw
npm install    # Success (550 packages)
npm run build  # Success (TypeScript compiled)
npm pack       # Success (20.8 KB tarball created)
```

**Package Contents Verified**:
- ✅ README.md (7.6kB)
- ✅ assets/activity.svg (336B)
- ✅ assets/icon.png (17.9kB)
- ✅ dist/index.d.ts (454B)
- ✅ dist/index.js (698B)
- ✅ openclaw.plugin.json (4.9kB)
- ✅ package.json (1.4kB)

### Runtime Verification ⏳ (requires OpenClaw installation)
The following commands can be used to verify the plugin once OpenClaw is available:

```bash
# Install from tarball
openclaw plugins install npm-pack:./goperigon-openclaw-perigon-1.0.0.tgz

# Inspect loaded runtime
openclaw plugins inspect perigon --runtime --json

# Verify MCP server connection
openclaw mcp doctor perigon --probe

# Check MCP status
openclaw mcp status perigon --verbose

# List available tools
openclaw mcp probe perigon

# Test OAuth authentication
openclaw mcp login perigon
```

**Note**: These verification steps require an OpenClaw installation and were not executed in this environment. The package structure and build have been verified to be correct.

## Installation Instructions

### For Users (when published to ClawHub)
```bash
openclaw plugins install clawhub:goperigon/openclaw-perigon
openclaw mcp login perigon  # OAuth authentication
```

### For Development/Testing
```bash
cd marketplace/openclaw
npm install
npm run build
npm pack
openclaw plugins install npm-pack:./goperigon-openclaw-perigon-1.0.0.tgz --force
```

### Configuration Options

**OAuth (Recommended)**:
```bash
openclaw mcp login perigon
```

**API Key**:
```json5
{
  plugins: {
    entries: {
      perigon: {
        enabled: true,
        config: {
          apiKey: "YOUR_API_KEY",
          useOAuth: false
        }
      }
    }
  }
}
```

**Tool Filtering**:
```json5
{
  plugins: {
    entries: {
      perigon: {
        config: {
          toolFilter: "research"  // or "all", "monitoring", etc.
        }
      }
    }
  }
}
```

## Publishing Commands

### Dry Run (validate before publishing)
```bash
npm i -g clawhub
clawhub login
clawhub package publish goperigon/openclaw-perigon --dry-run
```

### Actual Publish (DO NOT RUN until approved)
```bash
clawhub package publish goperigon/openclaw-perigon
```

After publishing, users install with:
```bash
openclaw plugins install clawhub:goperigon/openclaw-perigon
```

## Pull Request

**URL**: https://github.com/goperigon/perigon-mcp-server/pull/76
**Status**: Draft
**Branch**: cursor/openclaw-plugin-49ff

## Key Design Decisions

1. **Manifest-driven MCP**: The `mcpServers` field in the manifest declares the remote endpoint. OpenClaw's runtime connects automatically when the plugin is enabled.

2. **Minimal Entry Point**: The TypeScript entry point is minimal because all functionality is handled by OpenClaw's MCP client. No tool registration needed in code.

3. **Per-Requester OAuth**: Configured with `oauth.identity: "per-requester"` to isolate credentials for each authenticated user.

4. **Tool Contract Declaration**: All 55 tools are explicitly listed in `contracts.tools` so OpenClaw can discover ownership without loading the full runtime.

5. **Configuration Schema**: Includes fields for API key, OAuth preference, and tool filtering with UI hints for the Settings interface.

6. **Asset Reuse**: The icon.png is reused from the existing marketplace/perigon/ folder. The activity.svg is a simple document icon designed to work at 16px in both light and dark themes.

7. **Research Category**: Classified as "research" since the main user purpose is searching, filtering, and analyzing news data.

## Architecture Flow

1. User enables plugin in OpenClaw config
2. OpenClaw reads `openclaw.plugin.json` manifest
3. OpenClaw's MCP client connects to `https://mcp.perigon.io/v1/mcp`
4. User authenticates via OAuth or API key
5. OpenClaw discovers tools via MCP protocol
6. Tools appear in OpenClaw's catalog
7. Model can call tools during conversations
8. OpenClaw's MCP client routes requests to Perigon server
9. Responses flow back through OpenClaw to the model

## Comparison: OpenClaw vs Other Marketplaces

| Feature | Agent Plugins | Claude | OpenClaw |
|---------|--------------|--------|-----------|
| **MCP Support** | Via mcp.json | Bundle format | Native `mcpServers` field |
| **Auth** | OAuth + API key | Bundle-specific | Native MCP OAuth + API key |
| **Tool Discovery** | JSON schema | Manifest | MCP protocol discovery |
| **Package Format** | plugin.json | Claude bundle | openclaw.plugin.json |
| **Installation** | Plugin manager | Claude plugins | `openclaw plugins install` |

The Perigon MCP server is now available across three marketplaces:
- Agent Plugins (existing in `marketplace/perigon/`)
- OpenClaw (new in `marketplace/openclaw/`)
- Claude/Cursor bundles (via existing formats)

## Success Criteria Met

✅ Self-contained npm package in `marketplace/openclaw/`
✅ Follows OpenClaw plugin structure and conventions
✅ Uses OpenClaw's native MCP server support
✅ Supports both OAuth and API key authentication
✅ All 55 Perigon tools exposed through proper contracts
✅ Includes plugin manifest with complete metadata
✅ Assets (icon.png, activity.svg) included
✅ README with installation, config, and publish steps
✅ TypeScript builds cleanly
✅ npm pack includes all required files
✅ Pull request created as draft
✅ Publishing commands documented (dry-run provided)

## Next Steps

1. **Review**: Team reviews the plugin structure and implementation
2. **Test**: Install and verify in an OpenClaw environment
3. **Refinement**: Make any necessary adjustments based on testing
4. **Publish**: Run the ClawHub publish command when ready
5. **Documentation**: Update main README to mention OpenClaw availability
