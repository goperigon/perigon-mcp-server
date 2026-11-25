# Agent Guidelines for Perigon MCP Server

## Important
DO NOT run the dev server unless explicitly told to
DO NOT needlessly build the app for no reason

## Build/Test Commands
- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run deploy` - Deploy to Cloudflare Workers
- `bun run mcp` - Run MCP inspector
- `bun run gen` - Generate Wrangler types
- `bun test` - Run unit tests (smoke tests skip without `PERIGON_API_KEY`)

## Code Style
- **TypeScript**: Strict mode, ES2021 target, avoid `any` types
- **React**: Functional components with hooks, JSX transform
- **Imports**: ES modules, prefer named imports, React import required
- **Formatting**: 2-space indentation, double quotes, camelCase for props/functions
- **Components**: PascalCase naming, store in `src/components/`
- **CSS**: TailwindCSS with custom tokens (gold, surface, dark themes)
- **Error Handling**: Use try/catch for async, TypeScript interfaces for validation

## Perigon Brand Colors
- **Primary**: `#227C9D` (light), `#34B3E2` (dark)
- **Background**: `#FBFBF9` (light), `#1F1F1F` (dark)
- **Text**: `#121212` (light), `#FFFFFF` (dark)
- **Muted**: `#44403C` (light), `#C1C1C1` (dark)

## Dependencies & Architecture
- Built on Vite + React + TypeScript + TailwindCSS v4
- Cloudflare Workers runtime with Wrangler deployment
- AI SDK (@ai-sdk/react) for chat, MCP SDK for protocol
- No Cursor/Copilot rules configured

## Key Patterns
- Use `useChat` hook from @ai-sdk/react for chat functionality
- Custom TailwindCSS design tokens for consistent theming
- Proper TypeScript interfaces for all props and data structures

## Adding or changing a tool
`test/unit/mcp/tool-catalog.test.ts` fails until the in-repo items are done.
1. Register it in `TOOL_DEFINITIONS` (`worker/mcp/tools/index.ts`) or `SOCIAL_TOOL_DEFINITIONS` (`worker/mcp/tools/social/index.ts`).
2. Give it exactly one session tier in `worker/mcp/tool-registration.ts`: always-on default, `SCOPE_TO_TOOLS`, or `OPT_IN_TOOL_NAMES`. Add it to a profile in `worker/mcp/tools/selection.ts` if one fits.
3. Add a README row under Tools with the matching Availability (`Default`, ``Scope: `X` ``, `Opt-in`, or ``Social: `X` ``).
4. Add a playground entry to `MCP_TOOLS` in `src/lib/mcp-tools.ts` (registry tools only, not social).
5. Add or update its bullet in `worker/mcp/instructions.ts`, and only reference tools that are active in the session.
6. State every field the Perigon API requires in the tool or parameter description; agents cannot see backend validators.
7. Update `skills/`, `marketplace/perigon/skills/`, and `raycast/skills/` if the tool changes a workflow.
8. Outside this repo: update the public docs pages (perigon.io/docs/api/mcp, perigon.io/docs/signals/mcp) and `marketplace/ANNOTATION-REVIEW-NOTES.txt`, and bump `server.json` `version` if the registry listing changes.
