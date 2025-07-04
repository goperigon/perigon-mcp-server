const SESSION_TOKEN_KEY = 'perigon_session_token';
const SESSION_EXPIRY_KEY = 'perigon_session_expiry';

export interface JWTPayload {
  exp: number;
  iat: number;
  [key: string]: any;
}

/**
 * Decode JWT payload without verification (client-side only)
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if JWT token is expired with optional buffer
 */
export function isTokenExpired(token: string, bufferMinutes: number = 5): boolean {
  if (!token) return true;
  
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  
  const now = Date.now() / 1000;
  const bufferSeconds = bufferMinutes * 60;
  
  return payload.exp < (now + bufferSeconds);
}

/**
 * Store session token in localStorage
 */
export function storeSessionToken(token: string): void {
  try {
    const payload = decodeJWT(token);
    if (payload?.exp) {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
      localStorage.setItem(SESSION_EXPIRY_KEY, payload.exp.toString());
    }
  } catch (error) {
    console.error('Failed to store session token:', error);
  }
}

/**
 * Retrieve session token from localStorage
 */
export function getStoredSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Get stored session expiry timestamp
 */
export function getStoredSessionExpiry(): number | null {
  try {
    const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
    return expiry ? parseInt(expiry, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Clear stored session data
 */
export function clearSessionData(): void {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
  } catch (error) {
    console.error('Failed to clear session data:', error);
  }
}

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}