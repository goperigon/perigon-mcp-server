import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, ChevronDown, Key, Check, Calendar, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useApiKeys } from "@/lib/api-keys-context";

export default function ApiKeySelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { isPerigonAuthenticated, user } = useAuth();
  const {
    availablePerigonKeys,
    selectedPerigonKeyId,
    setSelectedPerigonKeyId,
    isUsingPerigonAuth,
    isLoadingApiKeys,
    selectedPerigonKey,
  } = useApiKeys();

  if (!isPerigonAuthenticated || !user) {
    return null;
  }

  // Show loading state while fetching API keys
  if (isLoadingApiKeys) {
    return (
      <div className="flex items-center space-x-2 z-50">
        <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center animate-pulse">
          <User className="w-3 h-3 text-muted-foreground" />
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Loading...
        </span>
      </div>
    );
  }

  // Don't show if not using Perigon auth or no keys available
  if (!isUsingPerigonAuth || availablePerigonKeys.length === 0) {
    return null;
  }

  const handleKeySelect = (keyId: string) => {
    setSelectedPerigonKeyId(keyId);
    setIsOpen(false);
  };

  const handleSignOut = () => {
    // Redirect to sign out
    window.location.href = "https://perigon.io/sign-out";
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-2 flex items-center space-x-2"
      >
        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <User className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs hidden sm:inline">{user.email}</span>
        <ChevronDown className="w-3 h-3" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute right-0 top-full mt-2 w-80 z-[9999] shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm">{user.email}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Perigon Account
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* API Key Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">API Keys</h4>
                  <Badge variant="outline" className="text-xs">
                    {availablePerigonKeys.length} available
                  </Badge>
                </div>

                {selectedPerigonKey && (
                  <div className="mb-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                    <strong>Selected:</strong>{" "}
                    {selectedPerigonKey.name || "Unnamed Key"}
                  </div>
                )}

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {" "}
                  {availablePerigonKeys.map((apiKey) => (
                    <div
                      key={apiKey.id}
                      className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedPerigonKeyId === apiKey.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handleKeySelect(apiKey.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <Key className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm font-medium truncate">
                              {apiKey.name || "Unnamed Key"}
                            </span>
                            {selectedPerigonKeyId === apiKey.id && (
                              <Check className="w-3 h-3 text-primary" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(apiKey.createdAt).toLocaleDateString()}
                            </span>
                            <Badge
                              variant={apiKey.enabled ? "outline" : "secondary"}
                              className="text-xs"
                            >
                              {apiKey.enabled ? "Active" : "Disabled"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t pt-3 space-y-2 z-50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="w-full justify-start text-red-600 hover:text-red-700"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
