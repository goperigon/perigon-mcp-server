import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, ExternalLink } from "lucide-react";

export default function PerigonLogin() {
  const handleLogin = () => {
    const currentUrl = window.location.href;
    const redirectUrl = `https://www.perigon.io/sign-in?redirectTo=${currentUrl}`;
    window.location.href = redirectUrl;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign in with Perigon</CardTitle>
          <p className="text-sm text-muted-foreground">
            Access the MCP playground with your Perigon account
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
            <div className="font-medium mb-1">What you'll get:</div>
            <ul className="space-y-1">
              <li>
                • Interactive tools explorer to discover powerful MCP
                capabilities
              </li>
              <li>• AI chat playground with the available tools</li>
              <li>• Secure single sign-on with your Perigon account</li>
              <li>• Seamless access to your existing Perigon API keys</li>
            </ul>
          </div>

          <Button onClick={handleLogin} className="w-full" size="lg">
            Sign in with Perigon
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Don't have a Perigon account?{" "}
              <a
                href="https://perigon.io/sign-up"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Sign up here
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
