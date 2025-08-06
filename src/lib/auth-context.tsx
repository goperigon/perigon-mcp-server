import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { PerigonAuthService } from "./perigon-auth-service";

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isPerigonAuthenticated: boolean;
  user: User | null;
  secret: string | null;
  login: (secret: string) => void;
  invalidate: () => Promise<void>;
  checkPerigonAuth: (request: Request) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [secret, setSecret] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPerigonAuthenticated, setIsPerigonAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const reauthResolveRef = useRef<(() => void) | null>(null);
  const perigonAuthService = new PerigonAuthService();

  useEffect(() => {
    const request = new Request("https://api.perigon.io/v1/user", {
      credentials: "include",
    });

    const storedSecret = localStorage.getItem("auth-secret");
    if (storedSecret) {
      setSecret(storedSecret);
      setIsAuthenticated(true);
    }

    checkPerigonAuth(request);
  }, []);

  const checkPerigonAuth = async (request: Request) => {
    try {
      const validatedUser = await perigonAuthService.validatePerigonUser(
        request
      );
      if (validatedUser) {
        setIsPerigonAuthenticated(true);
        setUser(validatedUser);
      } else {
        setIsPerigonAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking Perigon authentication:", error);
      setIsPerigonAuthenticated(false);
      setUser(null);
    }
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
        user,
        secret,
        login,
        invalidate,
        checkPerigonAuth,
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
