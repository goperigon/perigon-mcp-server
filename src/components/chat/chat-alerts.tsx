import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ALERT_BASE_CLASS =
  "mx-6 mt-4 animate-in slide-in-from-top-2";

export function ApiKeysErrorAlert({ message }: { message: string }) {
  return (
    <Card className={`${ALERT_BASE_CLASS} border-red-500/20 bg-red-500/10`}>
      <CardContent className="py-3 px-4">
        <div className="font-mono text-sm text-red-700 dark:text-red-300">
          <strong>API Key Error:</strong> {message}
        </div>
      </CardContent>
    </Card>
  );
}

export function NoApiKeyAlert() {
  return (
    <Card className={`${ALERT_BASE_CLASS} border-yellow-500/20 bg-yellow-500/10`}>
      <CardContent className="py-3 px-4">
        <div className="font-mono text-sm text-yellow-700 dark:text-yellow-300">
          <strong>No API Key Selected:</strong> Please select a Perigon API
          key from the dropdown in the header to use the chat functionality.
        </div>
      </CardContent>
    </Card>
  );
}

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  return (
    <Card
      className={`${ALERT_BASE_CLASS} border-destructive/20 bg-destructive/10`}
    >
      <CardContent className="py-3 px-4 flex justify-between items-center">
        <div className="font-mono text-sm text-destructive">
          <strong>Error:</strong> {message}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0"
        >
          ×
        </Button>
      </CardContent>
    </Card>
  );
}
