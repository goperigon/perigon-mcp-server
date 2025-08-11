import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ExternalLink } from "lucide-react";

export default function NoApiKeysAlert() {
  const handleCreateApiKey = () => {
    window.open(
      "https://www.perigon.io/settings/developers/api-keys",
      "_blank"
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl">No API Keys Found</CardTitle>
          <p className="text-sm text-muted-foreground">
            You need to create a Perigon API key to use the MCP server
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
            <div className="font-medium mb-1">To get started:</div>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Go to your Perigon dashboard</li>
              <li>Navigate to API Keys section</li>
              <li>Create a new API key</li>
              <li>Refresh this page</li>
            </ol>
          </div>

          <Button onClick={handleCreateApiKey} className="w-full" size="lg">
            <ExternalLink className="w-4 h-4 mr-2" />
            Create API Key on Perigon Dashboard
          </Button>

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
