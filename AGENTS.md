# Agent Guidelines for Perigon MCP Server

## Important
DO NOT run the dev server unless explicitly told to

## Build/Test Commands
- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run deploy` - Deploy to Cloudflare Workers
- `bun run mcp` - Run MCP inspector
- `bun run gen` - Generate Wrangler types
- No test framework configured - check with maintainer before adding tests

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
