# Agent Guidelines for Perigon MCP Server

## Build/Test Commands
- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run deploy` - Deploy to Cloudflare Workers
- `bun run mcp` - Run MCP inspector
- No test framework configured - check with maintainer before adding tests

## Code Style
- **TypeScript**: Strict mode enabled, ES2021 target
- **React**: Use functional components with hooks, JSX transform
- **Imports**: ES modules, prefer named imports
- **Formatting**: 2-space indentation, double quotes for strings
- **Types**: Use proper TypeScript types, avoid `any` (seen in MessageBubble:6)
- **Components**: PascalCase for components, camelCase for props/functions
- **CSS**: TailwindCSS with custom design tokens (gold, surface, dark themes)
- **File structure**: Components in `src/components/`, main app in `src/`

## Perigon Brand Style Guide

### Colors
- **Primary**: `#227C9D` (light), `#34B3E2` (dark)
- **Background**: `#FBFBF9` (light), `#1F1F1F` (dark)
- **Text**: `#121212` (light), `#FFFFFF` (dark)
- **Muted**: `#44403C` (light), `#C1C1C1` (dark)
- **Card Border**: `#E4E4E4` (light), `#2D2D2D` (dark)

### Typography
- **Font Stack**: `"Px Grotesk", Roboto, Inter, sans-serif`
- **H1**: 1.875rem, weight 600, letter-spacing -0.0025em
- **H2**: 1.45rem, weight 600, letter-spacing -0.0025em
- **Body**: 0.875rem, weight 400, letter-spacing 0.01em
- **Code**: ui-monospace stack, 0.75rem

### Components
- **Card Radius**: 1rem (--radius variable)
- **Card Padding**: 1.5rem
- **Button Radius**: 0.75rem, min-width 200px
- **Transitions**: all 0.2s ease

## Error Handling
- Use proper error boundaries for React components
- Handle async operations with try/catch
- Validate props with TypeScript interfaces

## Dependencies
- Built on Vite + React + TypeScript + TailwindCSS
- Uses Cloudflare Workers runtime with Wrangler
- AI SDK for chat functionality, MCP SDK for protocol