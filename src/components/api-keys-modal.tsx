import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Key, ExternalLink, X, Check, AlertCircle, User } from "lucide-react";
import { useApiKeys } from "@/lib/api-keys-context";
import { useAuth } from "@/lib/auth-context";

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeysModal({ isOpen, onClose }: ApiKeysModalProps) {
  const { apiKeys, setApiKeys, clearApiKeys, isPerigonKeyValid, isAnthropicKeyValid, isUsingPerigonAuth } = useApiKeys();
  const { isPerigonAuthenticated, user } = useAuth();
  const [showPerigonKey, setShowPerigonKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [tempKeys, setTempKeys] = useState({
    perigon: apiKeys.perigon,
    anthropic: apiKeys.anthropic,
  });

  React.useEffect(() => {
    if (isOpen) {
      setTempKeys({
        perigon: apiKeys.perigon,
        anthropic: apiKeys.anthropic,
      });
    }
  }, [isOpen, apiKeys]);

  const handleSave = () => {
    setApiKeys(tempKeys);
    onClose();
  };

  const handleClear = () => {
    clearApiKeys();
    setTempKeys({ perigon: "", anthropic: "" });
  };

  const validateTempPerigonKey = (key: string): boolean => {
    return key.length > 0;
  };

  const validateTempAnthropicKey = (key: string): boolean => {
    return key.length > 0 && key.startsWith("sk-ant-");
  };

  const isTempPerigonValid = validateTempPerigonKey(tempKeys.perigon);
  const isTempAnthropicValid = validateTempAnthropicKey(tempKeys.anthropic);
  const canSave = isTempPerigonValid && isTempAnthropicValid;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5" />
            <CardTitle>API Keys Configuration</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Configure your API keys to use the Perigon MCP Server. Both keys are required for full functionality.
          </div>

          {/* Perigon Authentication Status */}
          {isPerigonAuthenticated && user && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Signed in with Perigon</span>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Check className="w-3 h-3 mr-1" />
                  Authenticated
                </Badge>
              </div>
              <div className="text-xs text-green-700">
                Signed in as: {user.email}
              </div>
              {isUsingPerigonAuth && (
                <div className="text-xs text-green-700 mt-1">
                  Using your Perigon API key automatically
                </div>
              )}
            </div>
          )}

          {/* Perigon API Key */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Perigon API Key</label>
                {isPerigonKeyValid ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Check className="w-3 h-3 mr-1" />
                    Valid
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Invalid
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open("https://docs.perigon.io", "_blank")}
                className="text-xs"
              >
                Get API Key <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="relative">
              <Input
                type={showPerigonKey ? "text" : "password"}
                placeholder="Enter your Perigon API key..."
                value={tempKeys.perigon}
                onChange={(e) => setTempKeys({ ...tempKeys, perigon: e.target.value })}
                className={`pr-10 font-mono text-sm ${
                  tempKeys.perigon && !isTempPerigonValid ? "border-red-500" : ""
                }`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPerigonKey(!showPerigonKey)}
              >
                {showPerigonKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {tempKeys.perigon && !isTempPerigonValid && (
              <div className="text-xs text-red-600">
                Please enter a valid Perigon API key
              </div>
            )}
          </div>

          {/* Anthropic API Key */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Anthropic API Key</label>
                {isAnthropicKeyValid ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Check className="w-3 h-3 mr-1" />
                    Valid
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Invalid
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open("https://console.anthropic.com", "_blank")}
                className="text-xs"
              >
                Get API Key <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="relative">
              <Input
                type={showAnthropicKey ? "text" : "password"}
                placeholder="sk-ant-..."
                value={tempKeys.anthropic}
                onChange={(e) => setTempKeys({ ...tempKeys, anthropic: e.target.value })}
                className={`pr-10 font-mono text-sm ${
                  tempKeys.anthropic && !isTempAnthropicValid ? "border-red-500" : ""
                }`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowAnthropicKey(!showAnthropicKey)}
              >
                {showAnthropicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {tempKeys.anthropic && !isTempAnthropicValid && (
              <div className="text-xs text-red-600">
                Anthropic API keys should start with "sk-ant-"
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
            <div className="font-medium mb-1">Security Notice:</div>
            Your API keys are stored locally in your browser and are never sent to our servers. 
            They are only used to make direct API calls to Perigon and Anthropic services.
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleClear}>
              Clear All Keys
            </Button>
            <div className="space-x-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!canSave}>
                Save Keys
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}