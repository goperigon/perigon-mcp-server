import { useState, useEffect, useCallback } from 'react';
import type { SessionState } from '../types/session.types';
import {
  getStoredSessionToken,
  getStoredSessionExpiry,
  storeSessionToken,
  clearSessionData,
  isTokenExpired,
  isStorageAvailable
} from '../utils/sessionUtils';
import { authService } from '../services/authService';

export interface UseSessionManagerReturn {
  sessionState: SessionState;
  authenticate: (turnstileToken: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  needsAuthentication: boolean;
}

export function useSessionManager(): UseSessionManagerReturn {
  const [sessionState, setSessionState] = useState<SessionState>(() => {
    // Initialize from storage on first load
    const token = getStoredSessionToken();
    const expiresAt = getStoredSessionExpiry();
    
    return {
      token,
      expiresAt,
      isAuthenticated: token ? !isTokenExpired(token) : false,
      isReauthenticating: false
    };
  });

  /**
   * Check if we need to show authentication (no token or expired)
   */
  const needsAuthentication = !sessionState.isAuthenticated && !sessionState.isReauthenticating;

  /**
   * Authenticate with Turnstile token
   */
  const authenticate = useCallback(async (turnstileToken: string) => {
    try {
      setSessionState(prev => ({ ...prev, isReauthenticating: true }));
      
      const authResponse = await authService.authenticateWithTurnstile(turnstileToken);
      
      // Store the new token
      if (isStorageAvailable()) {
        storeSessionToken(authResponse.token);
      }
      
      setSessionState({
        token: authResponse.token,
        expiresAt: authResponse.expiresAt,
        isAuthenticated: true,
        isReauthenticating: false
      });
      
    } catch (error) {
      console.error('Authentication failed:', error);
      setSessionState(prev => ({ 
        ...prev, 
        isReauthenticating: false,
        isAuthenticated: false 
      }));
      throw error;
    }
  }, []);

  /**
   * Logout and clear session
   */
  const logout = useCallback(() => {
    clearSessionData();
    setSessionState({
      token: null,
      expiresAt: null,
      isAuthenticated: false,
      isReauthenticating: false
    });
  }, []);

  /**
   * Handle session expiry detection
   */
  const handleSessionExpiry = useCallback(() => {
    console.log('Session expired, requiring re-authentication');
    setSessionState(prev => ({
      ...prev,
      isAuthenticated: false,
      token: null,
      expiresAt: null
    }));
    clearSessionData();
  }, []);

  /**
   * Check token expiry periodically
   */
  useEffect(() => {
    if (!sessionState.token || !sessionState.isAuthenticated) return;

    const checkExpiry = () => {
      if (isTokenExpired(sessionState.token!, 1)) { // 1 minute buffer
        handleSessionExpiry();
      }
    };

    // Check immediately and then every minute
    checkExpiry();
    const interval = setInterval(checkExpiry, 60000);

    return () => clearInterval(interval);
  }, [sessionState.token, sessionState.isAuthenticated, handleSessionExpiry]);

  /**
   * Validate stored token on app startup
   */
  useEffect(() => {
    const validateStoredToken = async () => {
      const storedToken = getStoredSessionToken();
      
      if (storedToken && !isTokenExpired(storedToken)) {
        // Token exists and appears valid, verify with server
        try {
          const isValid = await authService.validateSession(storedToken);
          if (!isValid) {
            handleSessionExpiry();
          } else {
            setSessionState(prev => ({ ...prev, isAuthenticated: true }));
          }
        } catch {
          // If validation fails, require re-auth
          handleSessionExpiry();
        }
      } else if (storedToken) {
        // Token exists but is expired
        handleSessionExpiry();
      }
    };

    validateStoredToken();
  }, []); // Only run on mount

  return {
    sessionState,
    authenticate,
    logout,
    isAuthenticated: sessionState.isAuthenticated,
    needsAuthentication
  };
}