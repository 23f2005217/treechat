import { ChevronRight, Search, Sun, Moon, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AppHeaderProps {
  threadTitle?: string;
  onThemeToggle: () => void;
  isDark: boolean;
}

export function AppHeader({ threadTitle, onThemeToggle, isDark }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-background">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold text-foreground">TreeChat</h1>
        {threadTitle && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground truncate max-w-40">
              {threadTitle}
            </span>
          </>
        )}
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages and tasks..."
            className="pl-9 bg-muted/50"
            onClick={() => window.location.href = "/search"}
          />
        </div>
      </div>

      {/* Right: Theme toggle + Settings */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onThemeToggle}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = "/settings"}
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}