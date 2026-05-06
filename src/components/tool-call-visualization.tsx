import React from "react";
import { getToolName } from "ai";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  PenToolIcon as Tool,
} from "lucide-react";
import { getToolStateLabel } from "@/lib/tool-state-labels";

/**
 * Either a typed `tool-${name}` part or a `dynamic-tool` part. We accept the
 * loose `any` here because v5's discriminated unions over arbitrary tool sets
 * don't compose cleanly across module boundaries.
 */
interface ToolCallPart {
  type: string;
  toolName?: string;
  toolCallId?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  state?: string;
}

interface ToolCallVisualizationProps {
  part: ToolCallPart;
}

function resolveToolName(part: ToolCallPart): string {
  if (part.type === "dynamic-tool" && part.toolName) {
    return part.toolName;
  }
  // `getToolName` reads it from the typed `tool-${name}` discriminator.
  return getToolName(part as never);
}

function countParams(input: unknown): number {
  if (!input || typeof input !== "object") return 0;
  return Object.keys(input as Record<string, unknown>).length;
}

function formatOutput(output: unknown): string {
  if (typeof output === "string") return output;
  return JSON.stringify(output, null, 2);
}

export function ToolCallVisualization({ part }: ToolCallVisualizationProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const toolName = resolveToolName(part);
  const input = part.input ?? {};
  const state = part.state;
  const output = part.output;
  const errorText = part.errorText;
  const stateLabel = getToolStateLabel(state);
  const paramCount = countParams(input);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between font-mono text-xs p-3 h-auto bg-muted/50 hover:bg-muted/70 border-border/50"
        >
          <div className="flex items-center space-x-2">
            <Tool className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">TOOL CALL: {toolName}</span>
            <span className="text-muted-foreground">({paramCount} params)</span>
            {state && (
              <Badge variant="outline" className="text-xs border-border/50">
                {stateLabel}
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="bg-muted/30 border-l border-r border-b border-border/30 rounded-t-none rounded-b-lg">
          <CardContent className="py-3 px-4 font-mono text-xs space-y-3">
            <ToolParamsBlock input={input} />

            {state === "output-available" && output !== undefined && (
              <ToolOutputBlock output={output} />
            )}

            {state === "output-error" && errorText && (
              <ToolErrorBlock errorText={errorText} />
            )}

            {state === "input-available" && (
              <p className="text-muted-foreground text-xs">
                Tool call in progress...
              </p>
            )}

            {state === "input-streaming" && (
              <p className="text-muted-foreground text-xs">
                Streaming tool call parameters...
              </p>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ToolParamsBlock({ input }: { input: unknown }) {
  return (
    <div>
      <div className="font-semibold text-foreground mb-2">PARAMETERS:</div>
      <Card className="bg-card/50 border-border/30">
        <CardContent className="py-2 px-3">
          <pre className="overflow-auto max-h-48 text-foreground whitespace-pre break-words">
            {JSON.stringify(input, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function ToolOutputBlock({ output }: { output: unknown }) {
  return (
    <div>
      <div className="font-semibold text-foreground mb-2">RESULT:</div>
      <Card className="bg-card/50 border-border/30">
        <CardContent className="py-2 px-3">
          <pre className="overflow-auto max-h-64 text-foreground whitespace-pre-wrap break-words">
            {formatOutput(output)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function ToolErrorBlock({ errorText }: { errorText: string }) {
  return (
    <div>
      <div className="font-semibold text-destructive mb-2">ERROR:</div>
      <Card className="bg-card/50 border-border/30">
        <CardContent className="py-2 px-3">
          <pre className="overflow-auto max-h-64 text-destructive whitespace-pre-wrap break-words">
            {errorText}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
