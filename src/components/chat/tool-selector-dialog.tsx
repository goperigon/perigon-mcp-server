import React, { useCallback } from "react";
import { Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CATEGORY_LABELS,
  getToolsByCategory,
  TOOL_COUNT,
  ALL_TOOL_NAMES,
  type McpToolCategory,
} from "@/lib/mcp-tools";

const CATEGORIES: McpToolCategory[] = ["search", "stats", "use-cases"];

interface ToolSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Empty Set = all tools active (default). Non-empty = only those tools. */
  selectedTools: Set<string>;
  onSelectionChange: (tools: Set<string>) => void;
}

export function ToolSelectorDialog({
  open,
  onOpenChange,
  selectedTools,
  onSelectionChange,
}: ToolSelectorDialogProps) {
  const isAllActive = selectedTools.size === 0;
  const activeCount = isAllActive ? TOOL_COUNT : selectedTools.size;

  const isChecked = useCallback(
    (name: string) => isAllActive || selectedTools.has(name),
    [isAllActive, selectedTools]
  );

  const handleToggle = useCallback(
    (name: string, checked: boolean) => {
      if (isAllActive) {
        // Transition from "all active" to an explicit set
        const next = new Set(ALL_TOOL_NAMES);
        if (!checked) next.delete(name);
        onSelectionChange(next);
        return;
      }

      const next = new Set(selectedTools);
      if (checked) {
        next.add(name);
        // If all tools are now checked, go back to the empty-Set default
        if (next.size === TOOL_COUNT) {
          onSelectionChange(new Set());
          return;
        }
      } else {
        next.delete(name);
      }
      onSelectionChange(next);
    },
    [isAllActive, selectedTools, onSelectionChange]
  );

  const handleSelectAll = useCallback(() => {
    onSelectionChange(new Set());
  }, [onSelectionChange]);

  const handleDeselectAll = useCallback(() => {
    onSelectionChange(new Set(ALL_TOOL_NAMES.slice(0, 1)));
  }, [onSelectionChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2 pr-8">
            <Wrench className="size-4 text-primary shrink-0" />
            <DialogTitle className="text-base">MCP Tool Settings</DialogTitle>
            {!isAllActive && (
              <span className="ml-auto shrink-0 font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {activeCount} / {TOOL_COUNT} active
              </span>
            )}
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            Select which tools are available to the assistant. All tools are
            active by default — deselect any to reduce context and improve
            focus.
          </DialogDescription>

          {/* Select / Deselect all */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs font-mono"
              onClick={handleSelectAll}
              disabled={isAllActive}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs font-mono text-muted-foreground"
              onClick={handleDeselectAll}
              disabled={!isAllActive && selectedTools.size === 1}
            >
              Deselect all
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable tool list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {CATEGORIES.map((category) => {
            const tools = getToolsByCategory(category);
            return (
              <section key={category}>
                <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
                  {CATEGORY_LABELS[category]}
                </h3>
                <ul className="space-y-1">
                  {tools.map((tool) => {
                    const checked = isChecked(tool.name);
                    const checkboxId = `tool-${tool.name}`;
                    return (
                      <li key={tool.name}>
                        <label
                          htmlFor={checkboxId}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors group"
                        >
                          <Checkbox
                            id={checkboxId}
                            checked={checked}
                            onCheckedChange={(val) =>
                              handleToggle(tool.name, Boolean(val))
                            }
                            className="mt-0.5 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={`font-mono text-sm font-medium leading-tight transition-colors ${
                                checked
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {tool.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              {tool.description}
                            </p>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-mono">
            {isAllActive
              ? "All tools active"
              : `${activeCount} of ${TOOL_COUNT} tools active`}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="font-mono"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
