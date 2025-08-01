import React, { createContext, useContext, useState, useEffect } from "react";

interface ApiKeys {
  perigon: string;
  anthropic: string;
}

interface ApiKeysContextType {
  apiKeys: ApiKeys;
  setApiKeys: (keys: Partial<ApiKeys>) => void;
  clearApiKeys: () => void;
  hasValidKeys: () => boolean;
  isPerigonKeyValid: boolean;
  isAnthropicKeyValid: boolean;
}

const ApiKeysContext = createContext<ApiKeysContextType | undefined>(undefined);

const STORAGE_KEY = "perigon-api-keys";

const validatePerigonKey = (key: string): boolean => {
  return key.length > 0;
};

const validateAnthropicKey = (key: string): boolean => {
  return key.length > 0 && key.startsWith("sk-ant-");
};

export function ApiKeysProvider({ children }: { children: React.ReactNode }) {
  const [apiKeys, setApiKeysState] = useState<ApiKeys>({
    perigon: "",
    anthropic: "",
  });

  const [isPerigonKeyValid, setIsPerigonKeyValid] = useState(false);
  const [isAnthropicKeyValid, setIsAnthropicKeyValid] = useState(false);

  // Load keys from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ApiKeys;
        setApiKeysState(parsed);
      }
    } catch (error) {
      console.warn("Failed to load API keys from localStorage:", error);
    }
  }, []);

  // Validate keys whenever they change
  useEffect(() => {
    setIsPerigonKeyValid(validatePerigonKey(apiKeys.perigon));
    setIsAnthropicKeyValid(validateAnthropicKey(apiKeys.anthropic));
  }, [apiKeys]);

  const setApiKeys = (newKeys: Partial<ApiKeys>) => {
    const updatedKeys = { ...apiKeys, ...newKeys };
    setApiKeysState(updatedKeys);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedKeys));
    } catch (error) {
      console.warn("Failed to save API keys to localStorage:", error);
    }
  };

  const clearApiKeys = () => {
    setApiKeysState({ perigon: "", anthropic: "" });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear API keys from localStorage:", error);
    }
  };

  const hasValidKeys = () => {
    return isPerigonKeyValid && isAnthropicKeyValid;
  };

  return (
    <ApiKeysContext.Provider
      value={{
        apiKeys,
        setApiKeys,
        clearApiKeys,
        hasValidKeys,
        isPerigonKeyValid,
        isAnthropicKeyValid,
      }}
    >
      {children}
    </ApiKeysContext.Provider>
  );
}

export function useApiKeys() {
  const context = useContext(ApiKeysContext);
  if (context === undefined) {
    throw new Error("useApiKeys must be used within an ApiKeysProvider");
  }
  return context;
}