import { useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { useAuth } from "../lib/auth-context";
import { authenticateWithTurnstile } from "../lib/auth-service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export default function TurnstileAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const handleSuccess = async (token: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const secret = await authenticateWithTurnstile(token);
      login(secret);
    } catch (err) {
      setError("Authentication failed. Please try again.");
      console.error("Auth error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="max-w-md w-full mx-4">
        <CardHeader className="text-center">
          <CardTitle className="font-mono text-foreground">
            AUTHENTICATION REQUIRED
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Please complete the verification to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-center">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">
                Authenticating...
              </div>
            ) : (
              <Turnstile
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                onSuccess={handleSuccess}
                className="bg-popover"
                options={{
                  theme: "auto",
                  size: "normal",
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
