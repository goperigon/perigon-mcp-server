import React, { createContext, useContext, useState, useEffect } from "react";
import { PerigonApiKey, PerigonAuthService } from "./perigon-auth-service";
import { useAuth } from "./auth-context";

interface ApiKeysContextType {
  availablePerigonKeys: PerigonApiKey[];
  selectedPerigonKeyId: string | null;
  setSelectedPerigonKeyId: (keyId: string | null) => void;
  selectedPerigonKey: PerigonApiKey | null;
  fetchPerigonApiKeys: () => Promise<void>;
  isUsingPerigonAuth: boolean;
  hasNoApiKeys: boolean;
  isLoadingApiKeys: boolean;
  apiKeysError: string | null;
}

const ApiKeysContext = createContext<ApiKeysContextType | undefined>(undefined);

const SELECTED_KEY_STORAGE = "perigon-selected-key";

export function ApiKeysProvider({ children }: { children: React.ReactNode }) {
  const [availablePerigonKeys, setAvailablePerigonKeys] = useState<
    PerigonApiKey[]
  >([]);
  const [selectedPerigonKeyId, setSelectedPerigonKeyIdState] = useState<
    string | null
  >(null);
  const [isUsingPerigonAuth, setIsUsingPerigonAuth] = useState(false);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false);
  const [apiKeysError, setApiKeysError] = useState<string | null>(null);

  const { isPerigonAuthenticated } = useAuth();
  const perigonAuthService = new PerigonAuthService();

  // Load selected key from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SELECTED_KEY_STORAGE);
      if (stored) {
        setSelectedPerigonKeyIdState(stored);
      }
    } catch (error) {
      console.warn("Failed to load selected key from localStorage:", error);
    }
  }, []);

  // Fetch Perigon API keys when user is authenticated
  useEffect(() => {
    if (isPerigonAuthenticated) {
      fetchPerigonApiKeys();
    } else {
      setIsUsingPerigonAuth(false);
      setAvailablePerigonKeys([]);
      setSelectedPerigonKeyIdState(null);
    }
  }, [isPerigonAuthenticated]);

  const fetchPerigonApiKeys = async () => {
    if (!isPerigonAuthenticated) {
      return;
    }

    setIsLoadingApiKeys(true);
    setApiKeysError(null);

    try {
      const keys = await perigonAuthService.fetchApiKeys();
      setAvailablePerigonKeys(keys as PerigonApiKey[]);
      setIsUsingPerigonAuth(true);

      if (keys.length > 0) {
        // Check if the currently selected key still exists
        const currentKeyExists =
          selectedPerigonKeyId &&
          keys.find((k) => k.id === selectedPerigonKeyId);

        // If no key is selected or the selected key no longer exists, use the first available key
        if (!selectedPerigonKeyId || !currentKeyExists) {
          setSelectedPerigonKeyIdState(keys[0].id);
        }
      }
    } catch (error) {
      setApiKeysError(
        error instanceof Error ? error.message : "Failed to fetch API keys"
      );
    } finally {
      setIsLoadingApiKeys(false);
    }
  };

  const setSelectedPerigonKeyId = (keyId: string | null) => {
    setSelectedPerigonKeyIdState(keyId);
    try {
      if (keyId) {
        localStorage.setItem(SELECTED_KEY_STORAGE, keyId);
      } else {
        localStorage.removeItem(SELECTED_KEY_STORAGE);
      }
    } catch (error) {
      console.warn("Failed to save selected key to localStorage:", error);
    }
  };

  const selectedPerigonKey = selectedPerigonKeyId
    ? availablePerigonKeys.find((k) => k.id === selectedPerigonKeyId) || null
    : null;

  const hasNoApiKeys =
    isPerigonAuthenticated && availablePerigonKeys.length === 0;

  return (
    <ApiKeysContext.Provider
      value={{
        availablePerigonKeys,
        selectedPerigonKeyId,
        setSelectedPerigonKeyId,
        selectedPerigonKey,
        fetchPerigonApiKeys,
        isUsingPerigonAuth,
        hasNoApiKeys,
        isLoadingApiKeys,
        apiKeysError,
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
