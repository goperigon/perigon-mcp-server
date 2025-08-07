import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { PerigonAuthService, User } from "./perigon-auth-service";

type AuthCheckStatus = 'idle' | 'background-checking' | 'checking' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  isAuthenticated: boolean;
  isPerigonAuthenticated: boolean;
  authCheckStatus: AuthCheckStatus;
  user: User | null;
  secret: string | null;
  login: (secret: string) => void;
  invalidate: () => Promise<void>;
  checkPerigonAuth: (request: Request) => Promise<void>;
  ensureAuthenticated: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [secret, setSecret] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPerigonAuthenticated, setIsPerigonAuthenticated] = useState(false);
  const [authCheckStatus, setAuthCheckStatus] = useState<AuthCheckStatus>('idle');
  const [user, setUser] = useState<User | null>(null);
  const reauthResolveRef = useRef<(() => void) | null>(null);
  const perigonAuthService = new PerigonAuthService();

  useEffect(() => {
    const storedSecret = localStorage.getItem("auth-secret");
    if (storedSecret) {
      setSecret(storedSecret);
      setIsAuthenticated(true);
    }

    // Start background authentication check
    startBackgroundAuthCheck();
  }, []);

  const checkPerigonAuth = async () => {
    if (authCheckStatus === 'checking' || authCheckStatus === 'background-checking') return;
    
    setAuthCheckStatus('checking');
    try {
      const validatedUser = await perigonAuthService.validatePerigonUser();
      if (validatedUser) {
        setIsPerigonAuthenticated(true);
        setUser(validatedUser);
        setAuthCheckStatus('authenticated');
      } else {
        setIsPerigonAuthenticated(false);
        setUser(null);
        setAuthCheckStatus('unauthenticated');
      }
    } catch (error) {
      console.error("Error checking Perigon authentication:", error);
      setIsPerigonAuthenticated(false);
      setUser(null);
      setAuthCheckStatus('unauthenticated');
    }
  };

  const startBackgroundAuthCheck = async () => {
    if (authCheckStatus !== 'idle') return;
    
    setAuthCheckStatus('background-checking');
    try {
      const validatedUser = await perigonAuthService.validatePerigonUser();
      if (validatedUser) {
        setIsPerigonAuthenticated(true);
        setUser(validatedUser);
        setAuthCheckStatus('authenticated');
      } else {
        setIsPerigonAuthenticated(false);
        setUser(null);
        setAuthCheckStatus('unauthenticated');
      }
    } catch (error) {
      console.error("Error in background authentication check:", error);
      setIsPerigonAuthenticated(false);
      setUser(null);
      setAuthCheckStatus('unauthenticated');
    }
  };

  const ensureAuthenticated = async (): Promise<boolean> => {
    if (authCheckStatus === 'authenticated') return true;
    if (authCheckStatus === 'checking') {
      // Wait for ongoing check to complete
      return new Promise((resolve) => {
        const checkComplete = () => {
          if (authCheckStatus !== 'checking') {
            resolve(authCheckStatus === 'authenticated');
          } else {
            setTimeout(checkComplete, 100);
          }
        };
        checkComplete();
      });
    }
    
    await checkPerigonAuth();
    return isPerigonAuthenticated;
  };

  const login = (newSecret: string) => {
    setSecret(newSecret);
    setIsAuthenticated(true);
    localStorage.setItem("auth-secret", newSecret);

    // If there's a pending reauth, resolve it
    if (reauthResolveRef.current) {
      reauthResolveRef.current();
      reauthResolveRef.current = null;
    }
  };

  const invalidate = async (): Promise<void> => {
    setSecret(null);
    setIsAuthenticated(false);
    localStorage.removeItem("auth-secret");

    // Return a promise that resolves when re-authentication completes
    return new Promise((resolve) => {
      reauthResolveRef.current = resolve;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isPerigonAuthenticated,
        authCheckStatus,
        user,
        secret,
        login,
        invalidate,
        checkPerigonAuth,
        ensureAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
