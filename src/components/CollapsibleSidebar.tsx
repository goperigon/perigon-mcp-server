import { useState, useEffect } from "react";

interface Tool {
  name: string;
  description: string;
}

interface CollapsibleSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function CollapsibleSidebar({
  isOpen,
  onToggle,
}: CollapsibleSidebarProps) {
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
        const data = (await response.json()) as { tools: Tool[] };
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
      {/* Sidebar - positioned below header */}
      <div
        className={`fixed left-0 bg-surface border-r border-border shadow-xl z-30 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          width: "320px",
          top: "80px", // Start below the header
          height: "calc(100vh - 80px)", // Take remaining height
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-light flex items-center gap-2">
              Supported Tools
            </h2>
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
              <div className="space-y-4">
                {tools.map((tool, index) => (
                  <div
                    key={index}
                    className="group p-4 glass-light border border-border-soft rounded-xl hover:border-neural-purple/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                  >
                    <div className="space-y-3">
                      <h3 className="font-semibold text-light group-hover:text-neural-cyan transition-colors duration-200 flex items-center gap-2">
                        <span className="text-neural-cyan text-sm">⚡</span>
                        <span className="text-sm">{tool.name}</span>
                      </h3>
                      <p className="text-xs text-light-gray leading-relaxed">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay - only show when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20"
          style={{ top: "80px" }} // Start below header
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
}
