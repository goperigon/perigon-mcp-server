import { Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const DOTS = [
  { animationDelay: "0s" },
  { animationDelay: "0.1s" },
  { animationDelay: "0.2s" },
] as const;

/**
 * Bouncing-dots indicator shown while the assistant is preparing its first
 * response token (`status === "submitted"`).
 */
export function ThinkingIndicator() {
  return (
    <div className="flex items-start space-x-4">
      <div className="w-10 h-10 flex items-center justify-center text-muted-foreground">
        <Bot className="w-5 h-5" />
      </div>
      <Card className="bg-card/95 backdrop-blur-sm shadow-sm py-0 border border-border/30">
        <CardContent className="py-1.5 px-3">
          <div className="flex items-center space-x-3 text-sm font-mono">
            <span>Thinking...</span>
            <div className="flex space-x-1">
              {DOTS.map((style, i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={style}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
