import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, MessageSquare, Settings } from "lucide-react";
import AuthenticatedChatPlayground from "./AuthenticatedChatPlayground";
import { cn } from "../lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { TurnstileOverlay } from "./TurnstileOverlay";
import { 
  useAuthentication, 
  createAppStateSnapshot 
} from "../contexts/AuthenticationContext";

// TODO: proper json schema
interface ToolParameter {
  type: string;
  description?: string;
  default?: any;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  items?: { type: string };
  properties?: Record<string, ToolParameter>;
  exclusiveMinimum?: number;
}

interface MCPTool {
  name: string;
  description: string;
  args: {
    type: string;
    properties: Record<string, ToolParameter>;
  };
}

export default function AuthenticatedApp() {
  // Authentication context
  const auth = useAuthentication();
  
  // App state that needs to be preserved during re-authentication
  const [activeTab, setActiveTab] = useState<"inspector" | "chat">("inspector");
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [toolParams, setToolParams] = useState<Record<string, any>>({});
  const [rawInputValues, setRawInputValues] = useState<Record<string, string>>({});
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authentication state
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Fetch tools with authentication
  useEffect(() => {
    const fetchTools = async () => {
      if (!auth.isAuthenticated) return;

      setLoading(true);
      setError(null);
      try {
        const response = await auth.authenticatedFetch("/v1/api/tools");
        if (!response.ok) {
          throw new Error(`Failed to fetch tools: ${response.statusText}`);
        }
        const data = (await response.json()) as { tools: MCPTool[] };
        setTools(data.tools || []);
      } catch (err) {
        if (err instanceof Error && err.message.includes('Authentication required')) {
          // Authentication error will be handled by the auth context
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to fetch tools");
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, [auth.isAuthenticated, auth.authenticatedFetch]);

  // Restore state after successful authentication
  useEffect(() => {
    if (auth.isAuthenticated && !auth.sessionState.isReauthenticating) {
      const restoredState = auth.restoreState();
      if (restoredState) {
        console.log('Restoring preserved app state');
        setActiveTab(restoredState.activeTab);
        setSelectedTool(restoredState.selectedTool);
        setToolParams(restoredState.toolParams);
        setExecutionResult(restoredState.executionResult);
        
        // Clear the preserved state after restoration
        auth.clearPreservedState();
      }
      setIsAuthenticating(false);
    }
  }, [auth.isAuthenticated, auth.sessionState.isReauthenticating]);

  // Handle authentication requirement
  useEffect(() => {
    if (auth.needsAuthentication && auth.isAuthenticated === false) {
      // Preserve current state before showing authentication
      const currentState = createAppStateSnapshot(
        [], // Chat messages will be handled separately
        '', // Chat input will be handled separately
        selectedTool,
        toolParams,
        executionResult,
        activeTab
      );
      auth.preserveCurrentState(currentState);
      setIsAuthenticating(true);
    }
  }, [auth.needsAuthentication, auth.isAuthenticated]);

  // Handle Turnstile success
  const handleTurnstileSuccess = async (turnstileToken: string) => {
    try {
      await auth.authenticate(turnstileToken);
      console.log('Authentication successful');
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  };

  const getDefaultParams = (
    properties: Record<string, ToolParameter>,
  ): Record<string, any> => {
    const defaults: Record<string, any> = {};

    Object.entries(properties).forEach(([paramName, param]) => {
      if (param.default !== undefined) {
        defaults[paramName] = param.default;
      }
    });

    return defaults;
  };

  const handleExecuteTool = async () => {
    if (!selectedTool) return;

    const callTool = async () => {
      setIsExecuting(true);
      setExecutionResult(null);
      try {
        const response = await auth.authenticatedFetch("/v1/api/tools", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tool: selectedTool,
            args: toolParams,
          }),
        });
        if (!response.ok) {
          throw new Error(`Failed to execute tool: ${response.statusText}`);
        }
        const data = (await response.json()) as { result: string };
        setExecutionResult(data.result);
      } catch (err) {
        if (err instanceof Error && err.message.includes('Authentication required')) {
          // Authentication will be handled by the auth context
          return;
        }
        setExecutionResult(
          err instanceof Error ? err.message : "Failed to execute tool",
        );
      } finally {
        setIsExecuting(false);
      }
    };
    callTool();
  };

  const selectedToolData = tools.find((tool) => tool.name === selectedTool);

  // Render parameter inputs (same as original)
  const renderParameterInput = (
    paramName: string,
    param: ToolParameter,
    value: any,
  ) => {
    const updateValue = (newValue: any) => {
      setToolParams((prev) => ({
        ...prev,
        [paramName]: newValue,
      }));
    };

    if (param.enum) {
      return (
        <Select value={value || ""} onValueChange={updateValue}>
          <SelectTrigger className="h-10 sm:h-8 text-sm sm:text-xs">
            <SelectValue placeholder={`Select ${paramName}`} />
          </SelectTrigger>
          <SelectContent>
            {param.enum.map((option) => (
              <SelectItem
                key={option}
                value={option}
                className="text-sm sm:text-xs"
              >
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (param.type === "boolean") {
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={paramName}
            checked={value || false}
            onCheckedChange={updateValue}
          />
          <label htmlFor={paramName} className="text-sm sm:text-xs">
            {param.default !== undefined ? `(default: ${param.default})` : ""}
          </label>
        </div>
      );
    }

    if (param.type === "array") {
      const rawValue =
        rawInputValues[paramName] ||
        (Array.isArray(value) ? value.join(", ") : value || "");
      return (
        <Textarea
          placeholder={`Enter ${paramName} (comma-separated)`}
          value={rawValue}
          onChange={(e) => {
            const inputValue = e.target.value;
            setRawInputValues((prev) => ({ ...prev, [paramName]: inputValue }));

            const arrayValue = inputValue
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
            updateValue(arrayValue.length > 0 ? arrayValue : undefined);
          }}
          className="h-20 sm:h-16 text-sm sm:text-xs font-mono resize-none"
        />
      );
    }

    return (
      <Input
        type={
          param.type === "number" || param.type === "integer"
            ? "number"
            : "text"
        }
        placeholder={`Enter ${paramName}`}
        value={value || ""}
        onChange={(e) => {
          const newValue =
            param.type === "number" || param.type === "integer"
              ? e.target.value
                ? Number(e.target.value)
                : undefined
              : e.target.value || undefined;
          updateValue(newValue);
        }}
        min={param.minimum}
        max={param.maximum}
        className="h-10 sm:h-8 text-sm sm:text-xs font-mono"
      />
    );
  };

  return (
    <>
      {/* Main App Content */}
      <div className={cn(
        "h-screen bg-background overflow-hidden flex flex-col transition-opacity duration-200",
        isAuthenticating && "opacity-50"
      )}>
        {/* Header */}
        <header className="relative z-10 border-b border-border bg-card flex-shrink-0">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-12">
              <div className="flex items-center">
                <h1 className="text-sm sm:text-lg font-bold text-foreground font-mono flex items-center space-x-2">
                  <img
                    src="/favicon.ico"
                    alt="Perigon"
                    className="w-5 h-5 sm:w-6 sm:h-6"
                  />
                  <span className="hidden sm:inline">Perigon MCP Playground</span>
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <nav className="flex space-x-1">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("inspector")}
                    disabled={isAuthenticating}
                    className={cn(
                      "flex items-center space-x-1 sm:space-x-2 h-10 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm font-mono cursor-pointer border-2 border-transparent hover:border-border/50",
                      activeTab === "inspector" && "border-border",
                    )}
                  >
                    <Settings className="w-4 h-4 sm:w-3 sm:h-3" />
                    <span>INSPECTOR</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("chat")}
                    disabled={isAuthenticating}
                    className={cn(
                      "flex items-center space-x-1 sm:space-x-2 h-10 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm font-mono cursor-pointer border-2 border-transparent hover:border-border/50",
                      activeTab === "chat" && "border-border",
                    )}
                  >
                    <MessageSquare className="w-4 h-4 sm:w-3 sm:h-3" />
                    <span>CHAT</span>
                  </Button>
                </nav>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 flex-1 overflow-hidden">
          {activeTab === "inspector" ? (
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 h-full bg-background">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 h-full">
                {/* Desktop Tools List and Tool Configuration - same as original but with disabled state during auth */}
                <div className="hidden lg:flex lg:col-span-4 flex-col overflow-y-auto">
                  <Card className="border-2 border-border bg-card mb-2 flex-shrink-0">
                    <CardContent className="py-0 text-center">
                      <div className="font-mono text-sm font-bold text-foreground">
                        AVAILABLE TOOLS
                      </div>
                      <div className="text-xs text-muted-foreground pt-1">
                        {loading
                          ? "Loading..."
                          : error
                            ? "Error loading tools"
                            : `There are currently ${tools.length} supported tools`}
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {loading ? (
                      <Card className="border-2 border-border bg-card h-full">
                        <CardContent className="flex items-center justify-center h-full">
                          <div className="text-center text-muted-foreground text-sm font-mono">
                            <div className="text-2xl mb-2">⟳</div>
                            <p>LOADING TOOLS...</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : error ? (
                      <Card className="border-2 border-destructive/20 bg-destructive/5 h-full">
                        <CardContent className="p-4 flex items-center justify-center h-full">
                          <div className="text-center text-destructive text-sm font-mono">
                            <div className="text-2xl mb-2">⚠</div>
                            <p className="font-bold mb-2">ERROR LOADING TOOLS</p>
                            <p className="text-xs">{error}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : tools.length === 0 ? (
                      <Card className="border-2 border-border bg-card h-full">
                        <CardContent className="flex items-center justify-center h-full">
                          <div className="text-center text-muted-foreground text-sm font-mono">
                            <div className="text-2xl mb-2">○</div>
                            <p>NO TOOLS AVAILABLE</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      tools.map((tool, index) => (
                        <Card
                          key={tool.name}
                          className={cn(
                            "transition-all border-2 font-mono border-border bg-card",
                            !isAuthenticating && "cursor-pointer hover:border-muted-foreground",
                            isAuthenticating && "opacity-50 cursor-not-allowed"
                          )}
                          onClick={() => {
                            if (isAuthenticating) return;
                            setSelectedTool(tool.name);
                            setToolParams(getDefaultParams(tool.args.properties));
                            setRawInputValues({});
                            setExecutionResult(null);
                          }}
                        >
                          <CardContent className="p-3 sm:p-1.5">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1 min-w-0">
                                <span className="text-xs text-muted-foreground font-mono pb-1 pl-1">
                                  [{(index + 1).toString().padStart(2, "0")}]
                                </span>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-mono text-sm sm:text-sm font-bold text-foreground">
                                    {tool.name}
                                  </h3>
                                  <p className="text-xs text-muted-foreground hidden sm:block">
                                    {tool.description}
                                  </p>
                                </div>
                              </div>
                              <div className="text-lg sm:text-sm font-mono text-muted-foreground flex-shrink-0 mb-2 mr-2">
                                {selectedTool === tool.name ? "●" : "○"}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>

                {/* Tool Configuration and Execution Result columns - simplified */}
                <div className="hidden lg:block lg:col-span-8">
                  <div className="grid grid-cols-2 gap-4 h-full">
                    {/* Tool Configuration */}
                    <div className="overflow-y-auto">
                      {selectedToolData ? (
                        <Card className="border-2 border-accent h-full flex flex-col bg-card shadow-lg">
                          <CardHeader className="pb-4 flex-shrink-0 bg-card space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="font-mono text-xs text-muted-foreground">
                                SELECTED TOOL
                              </div>
                              <Button
                                onClick={handleExecuteTool}
                                disabled={isExecuting || isAuthenticating}
                                className="font-mono text-xs h-8 px-3"
                                size="sm"
                                variant="ghost"
                              >
                                <Play className="w-3 h-3 mr-1" />
                                {isExecuting ? "EXECUTING..." : "EXECUTE"}
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <CardTitle className="font-mono text-lg font-bold">
                                {selectedToolData.name}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {selectedToolData.description}
                              </p>
                            </div>
                          </CardHeader>
                          <CardContent className="flex-1 overflow-y-auto space-y-3">
                            <div className="font-mono text-xs text-muted-foreground border-b border-border pb-2">
                              PARAMETERS
                            </div>
                            {Object.entries(selectedToolData.args.properties).map(
                              ([paramName, param]) => (
                                <div key={paramName} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-foreground font-mono">
                                      • {paramName}
                                      {param.default !== undefined && (
                                        <span className="text-muted-foreground font-normal ml-1">
                                          (default: {JSON.stringify(param.default)})
                                        </span>
                                      )}
                                    </label>
                                    <Badge
                                      variant="outline"
                                      className="text-xs px-1 py-0 font-mono"
                                    >
                                      {param.type}
                                    </Badge>
                                  </div>
                                  {renderParameterInput(
                                    paramName,
                                    param,
                                    toolParams[paramName],
                                  )}
                                  {param.description && (
                                    <p className="text-xs text-muted-foreground leading-tight pl-4 border-l-2 border-border">
                                      {param.description}
                                    </p>
                                  )}
                                </div>
                              ),
                            )}
                          </CardContent>
                        </Card>
                      ) : (
                        <Card className="border-2 border-border h-full bg-card">
                          <CardContent className="flex items-center justify-center h-full bg-card">
                            <div className="text-center text-muted-foreground text-sm font-mono">
                              <div className="text-4xl mb-4">○</div>
                              <p>SELECT A TOOL TO EXAMINE</p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Execution Result */}
                    <div className="overflow-y-auto">
                      <Card className="border-2 border-border h-full flex flex-col bg-card">
                        <CardHeader className="pb-3 flex-shrink-0">
                          <CardTitle className="text-sm font-mono text-foreground">
                            EXECUTION RESULT
                            <div className="text-xs text-muted-foreground font-normal">
                              Output Console
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto">
                          {executionResult ? (
                            <Textarea
                              value={executionResult}
                              readOnly
                              className="h-full min-h-[400px] font-mono text-xs bg-muted resize-none border p-2 focus-visible:ring-0 focus-visible:border-transparent"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <div className="text-center text-muted-foreground text-xs font-mono">
                                <div className="text-2xl mb-4">□</div>
                                <p>EXECUTION RESULTS</p>
                                <p>WILL APPEAR HERE</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <AuthenticatedChatPlayground />
          )}
        </main>
      </div>

      {/* Turnstile Overlay */}
      <TurnstileOverlay
        isVisible={isAuthenticating || auth.needsAuthentication}
        onSuccess={handleTurnstileSuccess}
        isLoading={auth.sessionState.isReauthenticating}
      />
    </>
  );
}