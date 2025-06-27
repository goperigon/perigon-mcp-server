import { useState, useEffect } from "react";

interface Tool {
  name: string;
  description: string;
  args: Record<string, any>;
}

interface ToolsSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ToolsSidebar({ isOpen, onToggle }: ToolsSidebarProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTools = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/v1/api/tools");
        if (!response.ok) {
          throw new Error(`Failed to fetch tools: ${response.statusText}`);
        }
        const data = await response.json() as { tools: Tool[] };
        setTools(data.tools || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch tools");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchTools();
    }
  }, [isOpen]);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed top-1/2 left-4 z-50 p-2 bg-surface border border-border rounded-lg shadow-lg hover:bg-surface/80 transition-colors duration-200"
        aria-label={isOpen ? "Close tools sidebar" : "Open tools sidebar"}
      >
        <svg
          className={`w-5 h-5 text-light transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-surface border-r border-border shadow-xl z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "320px" }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-light">Available Tools</h2>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-dark/20 rounded transition-colors duration-200"
              aria-label="Close sidebar"
            >
              <svg
                className="w-5 h-5 text-light"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-light-gray">Loading tools...</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && tools.length === 0 && (
              <div className="text-center py-8">
                <p className="text-light-gray">No tools available</p>
              </div>
            )}

            {!loading && !error && tools.length > 0 && (
              <div className="space-y-3">
                {tools.map((tool, index) => (
                  <div
                    key={index}
                    className="p-3 bg-dark/20 border border-border rounded-lg hover:bg-dark/30 transition-colors duration-200"
                  >
                    <h3 className="font-medium text-light mb-1">{tool.name}</h3>
                    <p className="text-sm text-light-gray mb-2">
                      {tool.description}
                    </p>
                    {Object.keys(tool.args).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-primary cursor-pointer hover:text-primary/80">
                          Parameters ({Object.keys(tool.args).length})
                        </summary>
                        <div className="mt-2 pl-2 border-l-2 border-border">
                          {Object.entries(tool.args).map(([key, value]) => (
                            <div key={key} className="mb-1">
                              <code className="text-xs bg-dark/40 px-1 py-0.5 rounded text-light">
                                {key}
                              </code>
                              {typeof value === "object" && value?.type && (
                                <span className="text-xs text-light-gray ml-1">
                                  ({value.type})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
}