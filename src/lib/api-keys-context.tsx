import React, { createContext, useContext, useState, useEffect } from "react";
import { PerigonAuthService } from "./perigon-auth-service";
import { useAuth } from "./auth-context";

interface ApiKeys {
  perigon: string;
  anthropic: string;
}

interface PerigonApiKey {
  id: string;
  key: string;
  name: string;
  enabled: boolean;
  createdAt: string;
}

interface ApiKeysContextType {
  apiKeys: ApiKeys;
  setApiKeys: (keys: Partial<ApiKeys>) => void;
  clearApiKeys: () => void;
  hasValidKeys: () => boolean;
  isPerigonKeyValid: boolean;
  isAnthropicKeyValid: boolean;
  fetchPerigonApiKeys: () => Promise<void>;
  isUsingPerigonAuth: boolean;
  availablePerigonKeys: PerigonApiKey[];
  selectedPerigonKeyId: string | null;
  setSelectedPerigonKeyId: (keyId: string | null) => void;
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
  const [isUsingPerigonAuth, setIsUsingPerigonAuth] = useState(false);
  const [availablePerigonKeys, setAvailablePerigonKeys] = useState<PerigonApiKey[]>([]);
  const [selectedPerigonKeyId, setSelectedPerigonKeyId] = useState<string | null>(null);
  
  const { isPerigonAuthenticated } = useAuth();
  const perigonAuthService = new PerigonAuthService();

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

  // Fetch Perigon API keys when user is authenticated
  useEffect(() => {
    if (isPerigonAuthenticated) {
      fetchPerigonApiKeys();
    } else {
      setIsUsingPerigonAuth(false);
      setAvailablePerigonKeys([]);
      setSelectedPerigonKeyId(null);
    }
  }, [isPerigonAuthenticated]);

  // Update API key when selected key changes
  useEffect(() => {
    if (selectedPerigonKeyId && availablePerigonKeys.length > 0) {
      const selectedKey = availablePerigonKeys.find(k => k.id === selectedPerigonKeyId);
      if (selectedKey) {
        setApiKeysState(prev => ({ ...prev, perigon: selectedKey.key }));
      }
    }
  }, [selectedPerigonKeyId, availablePerigonKeys]);

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

  const fetchPerigonApiKeys = async () => {
    if (!isPerigonAuthenticated) {
      return;
    }

    try {
      const keys = await perigonAuthService.fetchApiKeys();
      setAvailablePerigonKeys(keys);
      
      if (keys.length > 0) {
        // Use selected key or default to first key
        const keyToUse = selectedPerigonKeyId 
          ? keys.find(k => k.id === selectedPerigonKeyId) || keys[0]
          : keys[0];
        
        setApiKeysState(prev => ({ ...prev, perigon: keyToUse.key }));
        setIsUsingPerigonAuth(true);
        
        // Set selected key if not already set
        if (!selectedPerigonKeyId) {
          setSelectedPerigonKeyId(keyToUse.id);
        }
      }
    } catch (error) {
      console.error("Error fetching Perigon API keys:", error);
    }
  };

  const hasValidKeys = () => {
    if (isUsingPerigonAuth && isPerigonAuthenticated) {
      return isPerigonKeyValid;
    }
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
        fetchPerigonApiKeys,
        isUsingPerigonAuth,
        availablePerigonKeys,
        selectedPerigonKeyId,
        setSelectedPerigonKeyId,
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