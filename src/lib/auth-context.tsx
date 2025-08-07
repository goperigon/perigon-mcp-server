import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  secret: string | null;
  login: (secret: string) => void;
  invalidate: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [secret, setSecret] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const reauthResolveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const storedSecret = localStorage.getItem("auth-secret");
    if (storedSecret) {
      setSecret(storedSecret);
      setIsAuthenticated(true);
    }
  }, []);

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
      value={{ isAuthenticated, secret, login, invalidate }}
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
