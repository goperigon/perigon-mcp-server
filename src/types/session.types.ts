export interface SessionState {
  token: string | null;
  expiresAt: number | null;
  isAuthenticated: boolean;
  isReauthenticating: boolean;
}

export interface AppState {
  // Chat state
  chatMessages: any[];
  chatInput: string;
  
  // Tool inspector state  
  selectedTool: string | null;
  toolParams: Record<string, any>;
  executionResult: string | null;
  activeTab: 'inspector' | 'chat';
  
  // UI state
  scrollPosition: number;
}

export interface AuthResponse {
  token: string;
  expiresAt: number;
  expiresIn: number;
}

export interface AuthError {
  error: string;
  message: string;
  code?: string;
}

export interface TurnstileConfig {
  siteKey: string;
  onSuccess: (token: string) => void;
  onError: (error: any) => void;
  onExpired: () => void;
}