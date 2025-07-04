import { useCallback } from 'react';
import { isTokenExpired } from '../utils/sessionUtils';

interface AuthenticatedFetchOptions extends RequestInit {
  skipAuth?: boolean;
}

interface UseAuthenticatedFetchReturn {
  authenticatedFetch: (input: RequestInfo, init?: AuthenticatedFetchOptions) => Promise<Response>;
}

export function useAuthenticatedFetch(
  sessionToken: string | null,
  onAuthRequired: () => void
): UseAuthenticatedFetchReturn {
  
  const authenticatedFetch = useCallback(async (
    input: RequestInfo,
    init: AuthenticatedFetchOptions = {}
  ): Promise<Response> => {
    const { skipAuth = false, ...fetchOptions } = init;
    
    // Proactive check: if no token or expired, trigger auth immediately
    if (!skipAuth && (!sessionToken || isTokenExpired(sessionToken))) {
      console.log('No valid session token, requiring authentication');
      onAuthRequired();
      throw new Error('Authentication required');
    }

    // Add authentication header if we have a token and not skipping auth
    const headers = new Headers(fetchOptions.headers);
    if (!skipAuth && sessionToken) {
      headers.set('X-Session-Token', sessionToken);
    }

    // Make the request
    try {
      const response = await fetch(input, {
        ...fetchOptions,
        headers
      });

      // Reactive check: handle 401 responses
      if (response.status === 401 && !skipAuth) {
        try {
          const errorData = await response.clone().json() as any;
          if (
            errorData.error === 'AUTHENTICATION_REQUIRED' || 
            errorData.code === 'TURNSTILE_REQUIRED'
          ) {
            console.log('Received 401 authentication required response');
            onAuthRequired();
            throw new Error('Session expired, authentication required');
          }
        } catch (jsonError) {
          // If we can't parse the error response, still treat 401 as auth required
          console.log('Received 401 response, requiring authentication');
          onAuthRequired();
          throw new Error('Session expired, authentication required');
        }
      }

      return response;
    } catch (error) {
      // Network errors or other fetch failures
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Network error during authenticated request:', error);
        throw new Error('Network error occurred');
      }
      throw error;
    }
  }, [sessionToken, onAuthRequired]);

  return { authenticatedFetch };
}

/**
 * Create a custom fetch function that works with the useChat hook
 * This allows us to inject authentication into the AI SDK's fetch calls
 */
export function createAuthenticatedFetchFunction(
  sessionToken: string | null,
  onAuthRequired: () => void
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Proactive check for authentication
    if (!sessionToken || isTokenExpired(sessionToken)) {
      console.log('No valid session for chat request, requiring authentication');
      onAuthRequired();
      throw new Error('Authentication required');
    }

    // Add authentication header
    const headers = new Headers(init?.headers);
    headers.set('X-Session-Token', sessionToken);

    try {
      const response = await fetch(input, {
        ...init,
        headers
      });

      // Handle 401 responses
      if (response.status === 401) {
        try {
          const errorData = await response.clone().json() as any;
          if (
            errorData.error === 'AUTHENTICATION_REQUIRED' || 
            errorData.code === 'TURNSTILE_REQUIRED'
          ) {
            console.log('Chat request received 401, requiring authentication');
            onAuthRequired();
            throw new Error('Session expired, authentication required');
          }
        } catch (jsonError) {
          console.log('Chat request received 401, requiring authentication');
          onAuthRequired();
          throw new Error('Session expired, authentication required');
        }
      }

      return response;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Network error during chat request:', error);
        throw new Error('Network error occurred');
      }
      throw error;
    }
  };
}