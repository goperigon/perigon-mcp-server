import { createContext, useContext, ReactNode } from 'react';
import { useSessionManager, UseSessionManagerReturn } from '../hooks/useSessionManager';
import { 
  useStatePreservation, 
  UseStatePreservationReturn,
  createAppStateSnapshot 
} from '../hooks/useStatePreservation';
import { 
  useAuthenticatedFetch, 
  createAuthenticatedFetchFunction 
} from '../hooks/useAuthenticatedFetch';
import type { AppState } from '../types/session.types';

interface AuthenticationContextValue extends UseSessionManagerReturn, UseStatePreservationReturn {
  // Additional methods
  requireAuthentication: () => void;
  authenticatedFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  createChatFetchFunction: () => typeof fetch;
  preserveCurrentState: (state: AppState) => void;
}

const AuthenticationContext = createContext<AuthenticationContextValue | null>(null);

interface AuthenticationProviderProps {
  children: ReactNode;
}

export function AuthenticationProvider({ children }: AuthenticationProviderProps) {
  // Core session management
  const sessionManager = useSessionManager();
  const statePreservation = useStatePreservation();
  
  // Authentication required handler
  const requireAuthentication = () => {
    // This will trigger the session manager to show Turnstile
    // The actual UI logic will be handled in the App component
    console.log('Authentication required - triggering re-auth flow');
  };

  // Authenticated fetch hook
  const { authenticatedFetch } = useAuthenticatedFetch(
    sessionManager.sessionState.token,
    requireAuthentication
  );

  // Create fetch function for useChat hook
  const createChatFetchFunction = () => {
    return createAuthenticatedFetchFunction(
      sessionManager.sessionState.token,
      requireAuthentication
    );
  };

  // Convenience method for preserving state
  const preserveCurrentState = (state: AppState) => {
    statePreservation.preserveState(state);
  };

  const contextValue: AuthenticationContextValue = {
    // Session manager methods
    ...sessionManager,
    
    // State preservation methods
    ...statePreservation,
    
    // Additional authentication methods
    requireAuthentication,
    authenticatedFetch,
    createChatFetchFunction,
    preserveCurrentState
  };

  return (
    <AuthenticationContext.Provider value={contextValue}>
      {children}
    </AuthenticationContext.Provider>
  );
}

export function useAuthentication(): AuthenticationContextValue {
  const context = useContext(AuthenticationContext);
  if (!context) {
    throw new Error('useAuthentication must be used within an AuthenticationProvider');
  }
  return context;
}

// Export helper for creating app state snapshots
export { createAppStateSnapshot };