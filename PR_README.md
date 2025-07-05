# PR: Session-Based Authentication with Turnstile Integration

## Summary

Implements sophisticated session-based authentication for the Perigon MCP playground with seamless user experience and state preservation.

## Key Features

✅ **30-minute JWT sessions** with automatic renewal  
✅ **Turnstile integration** for bot protection  
✅ **State preservation** during re-authentication  
✅ **Proactive & reactive** session validation  
✅ **Usage limits** (10 chat, 30 tool requests per session)  
✅ **Zero data loss** during authentication interruptions  

## Implementation Highlights

### Smart Session Management
- Automatic token validation with 5-minute expiry buffer
- 401 response handling triggers seamless re-authentication
- localStorage persistence for cross-session continuity

### User Experience Focus
- **Transparent authentication**: Turnstile only appears when needed
- **Preserved work**: Chat conversations and tool configurations maintained
- **Visual feedback**: Loading states and progress indicators
- **Graceful recovery**: Error handling without data loss

### Architecture
- **AuthenticationProvider**: Centralized session management
- **Authenticated fetch hooks**: Automatic header injection and 401 handling
- **State preservation**: Snapshot/restore for app and chat state
- **Mock service**: Complete development environment simulation

## Files Added/Modified

### New Files
- `src/types/session.types.ts` - TypeScript definitions
- `src/utils/sessionUtils.ts` - JWT handling and storage
- `src/services/authService.ts` - Mock authentication backend
- `src/hooks/useSessionManager.ts` - Core session management
- `src/hooks/useStatePreservation.ts` - State snapshot/restore
- `src/hooks/useAuthenticatedFetch.ts` - Authenticated request handling
- `src/contexts/AuthenticationContext.tsx` - Global auth provider
- `src/components/TurnstileOverlay.tsx` - Authentication UI
- `src/components/AuthenticatedApp.tsx` - Main app with auth
- `src/components/AuthenticatedChatPlayground.tsx` - Chat with auth

### Modified Files
- `src/app.tsx` - Wrapped with AuthenticationProvider

## Backend Integration Ready

The frontend is ready for backend integration with these endpoints:

```
POST /v1/api/session/create    # Exchange Turnstile for JWT
POST /v1/api/session/refresh   # Renew session
POST /v1/api/session/validate  # Check session validity
```

All existing API endpoints need to validate the `X-Session-Token` header and return appropriate 401 responses.

## Testing

- Mock service simulates realistic backend behavior
- 10% authentication failure rate for testing error handling
- Automatic network delay simulation
- Compatible with existing Turnstile configuration

## Impact

- **Security**: Bot protection without UX degradation
- **Scalability**: Rate limiting via session-based usage tracking
- **Reliability**: Graceful handling of session expiry and network issues
- **Maintainability**: Clean separation of auth concerns

Ready for production with backend endpoint implementation.