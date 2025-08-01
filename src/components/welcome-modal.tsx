import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, ExternalLink, ArrowRight } from "lucide-react";
import { useApiKeys } from "@/lib/api-keys-context";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenApiKeys: () => void;
}

export default function WelcomeModal({ isOpen, onClose, onOpenApiKeys }: WelcomeModalProps) {
  const { hasValidKeys } = useApiKeys();

  if (!isOpen || hasValidKeys()) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/favicon.ico"
              alt="Perigon"
              className="w-12 h-12"
            />
          </div>
          <CardTitle className="text-2xl font-mono">Welcome to Perigon MCP Playground</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-muted-foreground">
            To get started, you'll need to configure your API keys for both Perigon and Anthropic services.
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-2">
              <CardContent className="p-4 text-center">
                <Key className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-semibold mb-2">Perigon API Key</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Required for news search, company data, and journalist information
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("https://docs.perigon.io", "_blank")}
                  className="text-xs"
                >
                  Get API Key <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-4 text-center">
                <Key className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <h3 className="font-semibold mb-2">Anthropic API Key</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Required for AI chat functionality and intelligent responses
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("https://console.anthropic.com", "_blank")}
                  className="text-xs"
                >
                  Get API Key <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
            <div className="font-medium mb-2">🔒 Your API keys are secure:</div>
            <ul className="space-y-1 text-xs">
              <li>• Stored locally in your browser only</li>
              <li>• Never sent to our servers</li>
              <li>• Used only for direct API calls to Perigon and Anthropic</li>
            </ul>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={onClose}>
              Skip for now
            </Button>
            <Button onClick={() => { onOpenApiKeys(); onClose(); }}>
              Configure API Keys <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}