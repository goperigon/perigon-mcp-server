import { useCallback } from 'react';
import type { AppState } from '../types/session.types';

const APP_STATE_KEY = 'perigon_app_state_snapshot';

export interface UseStatePreservationReturn {
  preserveState: (state: AppState) => void;
  restoreState: () => AppState | null;
  clearPreservedState: () => void;
  hasPreservedState: () => boolean;
}

export function useStatePreservation(): UseStatePreservationReturn {
  /**
   * Save current application state to localStorage
   */
  const preserveState = useCallback((state: AppState) => {
    try {
      const serializedState = JSON.stringify({
        ...state,
        timestamp: Date.now()
      });
      localStorage.setItem(APP_STATE_KEY, serializedState);
      console.log('App state preserved for session re-authentication');
    } catch (error) {
      console.error('Failed to preserve app state:', error);
    }
  }, []);

  /**
   * Restore application state from localStorage
   */
  const restoreState = useCallback((): AppState | null => {
    try {
      const serializedState = localStorage.getItem(APP_STATE_KEY);
      if (!serializedState) return null;

      const state = JSON.parse(serializedState);
      
      // Check if the preserved state is not too old (max 1 hour)
      const maxAge = 60 * 60 * 1000; // 1 hour in milliseconds
      if (state.timestamp && (Date.now() - state.timestamp) > maxAge) {
        console.log('Preserved state is too old, discarding');
        clearPreservedState();
        return null;
      }

      // Remove timestamp before returning
      const { timestamp, ...appState } = state;
      console.log('App state restored from preservation');
      return appState as AppState;
    } catch (error) {
      console.error('Failed to restore app state:', error);
      return null;
    }
  }, []);

  /**
   * Clear preserved state from localStorage
   */
  const clearPreservedState = useCallback(() => {
    try {
      localStorage.removeItem(APP_STATE_KEY);
    } catch (error) {
      console.error('Failed to clear preserved state:', error);
    }
  }, []);

  /**
   * Check if there is preserved state available
   */
  const hasPreservedState = useCallback((): boolean => {
    try {
      return localStorage.getItem(APP_STATE_KEY) !== null;
    } catch {
      return false;
    }
  }, []);

  return {
    preserveState,
    restoreState,
    clearPreservedState,
    hasPreservedState
  };
}

/**
 * Helper function to capture current app state from components
 * This will be used by components to create AppState snapshots
 */
export function createAppStateSnapshot(
  chatMessages: any[] = [],
  chatInput: string = '',
  selectedTool: string | null = null,
  toolParams: Record<string, any> = {},
  executionResult: string | null = null,
  activeTab: 'inspector' | 'chat' = 'inspector',
  scrollPosition: number = 0
): AppState {
  return {
    chatMessages,
    chatInput,
    selectedTool,
    toolParams,
    executionResult,
    activeTab,
    scrollPosition
  };
}