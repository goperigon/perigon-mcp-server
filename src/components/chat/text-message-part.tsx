import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Copy } from "lucide-react";
import { MessageText } from "../message-text";

interface TextMessagePartProps {
  text: string;
  copyId: string;
  isCopied: boolean;
  onCopy: (id: string, text: string) => void;
}

/**
 * A single text part inside a message bubble, with a hover-revealed copy
 * button anchored to its top-right corner.
 */
export function TextMessagePart({
  text,
  copyId,
  isCopied,
  onCopy,
}: TextMessagePartProps) {
  return (
    <div className="relative group mb-3 pr-8">
      <Card className="inline-block bg-card/95 backdrop-blur-sm shadow-sm py-0 border border-border/30">
        <CardContent className="py-1.5 px-3">
          <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert [&>*:last-child]:mb-0">
            <MessageText text={text} />
          </div>
        </CardContent>
      </Card>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-6 w-6 p-0 hover:bg-muted/20"
        onClick={() => onCopy(copyId, text)}
      >
        {isCopied ? (
          <Check className="h-3 w-3 text-success" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
