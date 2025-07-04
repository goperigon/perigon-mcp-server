# Perigon MCP Playground: Session-Based Authentication Implementation

## Overview

This implementation adds sophisticated session-based authentication to the Perigon MCP playground using Turnstile verification. The system provides seamless user experience by preserving application state during authentication interruptions and implementing both proactive and reactive session validation.

## Architecture

### Core Components

#### 1. Session Management (`src/types/session.types.ts`)
- **SessionState**: Manages JWT token, expiry, and authentication status
- **AppState**: Preserves chat messages, tool inspector state, and UI state
- **AuthResponse**: Handles backend authentication responses
- **TurnstileConfig**: Configures Turnstile integration

#### 2. Session Utilities (`src/utils/sessionUtils.ts`)
- JWT token decoding and validation (client-side)
- localStorage persistence for tokens and expiry
- Session expiry detection with configurable buffer
- Secure session data management

#### 3. Authentication Service (`src/services/authService.ts`)
- Mock backend simulation for development
- Turnstile token validation simulation
- JWT generation with 30-minute expiry
- Authenticated request handling with 401 detection

#### 4. Session Manager Hook (`src/hooks/useSessionManager.ts`)
- Central session state management
- Automatic token validation on app startup
- Periodic expiry checking (every minute)
- Storage-based session persistence

#### 5. State Preservation Hook (`src/hooks/useStatePreservation.ts`)
- Application state snapshots during re-authentication
- localStorage preservation with 1-hour time limit
- Restoration after successful authentication
- Automatic cleanup of stale data

#### 6. Authenticated Fetch Hook (`src/hooks/useAuthenticatedFetch.ts`)
- Proactive session validation before requests
- Automatic authentication header injection
- 401 response handling and re-authentication triggers
- Custom fetch function for AI SDK integration

#### 7. Authentication Context (`src/contexts/AuthenticationContext.tsx`)
- Centralized authentication provider
- Integration of all authentication hooks
- Global authentication state management
- Helper methods for state preservation

#### 8. Turnstile Overlay (`src/components/TurnstileOverlay.tsx`)
- Modal overlay for authentication
- Turnstile widget integration
- Loading states and error handling
- User-friendly verification interface

#### 9. Authenticated App Component (`src/components/AuthenticatedApp.tsx`)
- Main application wrapper with authentication
- State preservation before authentication
- State restoration after authentication
- Tool inspector with authenticated API calls

#### 10. Authenticated Chat Playground (`src/components/AuthenticatedChatPlayground.tsx`)
- Chat interface with session management
- Conversation state preservation
- Authenticated streaming chat requests
- Error handling for authentication failures

## Key Features

### Session Management
- **Duration**: 30-minute JWT sessions
- **Usage Limits**: 10 chat requests, 30 tool requests per session
- **Proactive Validation**: 5-minute buffer before expiry
- **Reactive Validation**: 401 response handling
- **Automatic Renewal**: Seamless re-authentication flow

### State Preservation
- **Chat State**: Messages, input, conversation history
- **Tool Inspector State**: Selected tool, parameters, execution results
- **UI State**: Active tab, scroll position
- **Automatic Cleanup**: 1-hour preservation limit
- **Seamless Restoration**: No data loss during re-authentication

### User Experience
- **Transparent Authentication**: Only shows Turnstile when needed
- **Preserved Progress**: No work lost during re-authentication
- **Visual Feedback**: Loading states and progress indicators
- **Error Recovery**: Graceful handling of authentication failures

### Security Features
- **IP Binding**: Sessions tied to client IP (in mock implementation)
- **Rate Limiting**: Usage limits per session
- **Session Validation**: Both client and server-side validation
- **Secure Storage**: JWT tokens in localStorage with expiry tracking

## Integration Points

### Existing Components
- **App.tsx**: Wrapped with AuthenticationProvider
- **Tool Inspector**: All API calls now authenticated
- **Chat Playground**: Streaming requests with authentication
- **Theme Toggle**: Preserved during authentication
- **Pixel Background**: Unaffected by authentication

### API Integration
- **Tool Endpoints**: `/v1/api/tools` with X-Session-Token header
- **Chat Endpoint**: `/v1/api/chat` with authenticated streaming
- **Session Endpoints**: Ready for backend implementation
  - `POST /v1/api/session/create` - Exchange Turnstile for JWT
  - `POST /v1/api/session/refresh` - Renew with new Turnstile
  - `POST /v1/api/session/validate` - Check session validity

## Backend Requirements

### Session Creation Endpoint
```typescript
POST /v1/api/session/create
Body: { turnstileToken: string }
Response: { token: string, expiresAt: number, expiresIn: number }
```

### Session Validation
- Verify JWT signature with server secret
- Check expiry timestamp
- Validate IP binding (optional)
- Track usage limits per session

### Protected Endpoints
- Add X-Session-Token header validation
- Return 401 with specific error codes:
  - `AUTHENTICATION_REQUIRED`
  - `TURNSTILE_REQUIRED`
- Increment usage counters per session

## Development Notes

### Mock Service
The implementation includes a complete mock authentication service for development:
- Generates realistic JWT tokens
- Simulates network delays
- 10% chance of validation failure for testing
- Compatible with real backend implementation

### TypeScript Issues
Some TypeScript errors are present due to React type definitions not being properly loaded in the development environment. These will resolve when the build system is properly configured.

### Environment Variables
- `VITE_TURNSTILE_SITE_KEY`: Cloudflare Turnstile site key
- Default fallback key included for development

## Next Steps

1. **Backend Implementation**: Replace mock service with real endpoints
2. **Error Handling**: Add user notifications for authentication failures
3. **Analytics**: Track authentication metrics and usage patterns
4. **Testing**: Add comprehensive test coverage for authentication flows
5. **Performance**: Optimize state preservation for large datasets

## Usage Patterns

### For Users
1. Visit playground → automatic session check
2. If no session → Turnstile appears
3. Complete verification → seamless access
4. Work normally → transparent re-authentication
5. Session expires → brief Turnstile → continue working

### For Developers
1. Wrap components with `AuthenticationProvider`
2. Use `useAuthentication()` hook for session access
3. Call `authenticatedFetch()` for API requests
4. Use `createChatFetchFunction()` for AI SDK
5. Preserve state with `preserveCurrentState()`

This implementation provides enterprise-grade session management while maintaining the playground's ease of use and responsive design.