interface ToolInvocationProps {
  toolInvocation: any;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ToolInvocation({
  toolInvocation,
  isCollapsed,
  onToggleCollapse,
}: ToolInvocationProps) {
  const { toolName, state, args } = toolInvocation;

  return (
    <div className="bg-surface-elevated p-4 rounded-lg border-l-4 border-accent my-3 text-light shadow-md hover:shadow-lg transition-shadow duration-200 border">
      <div
        className="text-sm font-semibold text-accent mb-3 cursor-pointer hover:text-accent/80 flex items-center gap-2 transition-colors duration-200"
        onClick={onToggleCollapse}
      >
        <span>{isCollapsed ? "▶" : "▼"}</span>
        🔧 {toolName} ({state})
      </div>
      {!isCollapsed && (
        <>
          {args && (
            <div className="text-xs text-light mb-3">
              <strong>Arguments:</strong>
              <pre className="mt-1 overflow-x-auto">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {state === "result" && "result" in toolInvocation && (
            <div className="text-xs text-light">
              <strong>Result:</strong>
              <pre className="mt-1 overflow-x-auto">
                {typeof toolInvocation.result === "string"
                  ? toolInvocation.result
                  : JSON.stringify(toolInvocation.result, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
