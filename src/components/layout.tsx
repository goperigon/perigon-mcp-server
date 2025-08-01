import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isInspector =
    location.pathname === "/" || location.pathname === "/inspector";
  const isChat = location.pathname === "/chat";

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      {/* Clean Header */}
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
                  asChild
                  className={cn(
                    "flex items-center space-x-1 sm:space-x-2 h-10 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm font-mono cursor-pointer border-2 border-transparent hover:border-border/50",
                    isInspector && "border-border",
                  )}
                >
                  <Link to="/">
                    <Settings className="w-4 h-4 sm:w-3 sm:h-3" />
                    <span>INSPECTOR</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  asChild
                  className={cn(
                    "flex items-center space-x-1 sm:space-x-2 h-10 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm font-mono cursor-pointer border-2 border-transparent hover:border-border/50",
                    isChat && "border-border",
                  )}
                >
                  <Link to="/chat">
                    <MessageSquare className="w-4 h-4 sm:w-3 sm:h-3" />
                    <span>CHAT</span>
                  </Link>
                </Button>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
