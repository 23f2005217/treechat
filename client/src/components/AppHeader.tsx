import { ChevronRight, Search, Sun, Moon, Settings, Menu, X, Home } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AppHeaderProps {
  threadTitle?: string;
  onThemeToggle: () => void;
  isDark: boolean;
  onMobileMenuClick?: () => void;
  isMobileSidebarOpen?: boolean;
}

export function AppHeader({ threadTitle, onThemeToggle, isDark, onMobileMenuClick, isMobileSidebarOpen }: AppHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between gap-4 p-3 sm:p-4 border-b bg-background flex-shrink-0">
      {/* Left: Menu + Breadcrumb */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Mobile Menu Button */}
        {onMobileMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuClick}
            className="lg:hidden h-9 w-9"
            aria-label="Toggle menu"
          >
            {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        )}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <h1 className="text-xl font-semibold text-foreground hidden sm:block">TreeChat</h1>
          <h1 className="text-xl font-semibold text-foreground sm:hidden">TC</h1>
        </Link>
        {threadTitle && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground truncate max-w-32 sm:max-w-60 md:max-w-80">
              {threadTitle}
            </span>
          </>
        )}
      </div>

      {/* Center: Search - responsive */}
      <div className="flex-1 max-w-md mx-2 sm:mx-4 hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages and tasks..."
            className="pl-9 bg-muted/50 text-sm cursor-pointer"
            onClick={() => navigate("/search")}
            readOnly
          />
        </div>
      </div>

      {/* Mobile Search Button */}
      <div className="sm:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/search")}
          aria-label="Search"
          className="h-9 w-9"
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>

      {/* Right: Theme toggle + Settings */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              aria-label="Home"
              className="h-9 w-9"
            >
              <Home className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Home</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onThemeToggle}
              aria-label="Toggle theme"
              className="h-9 w-9"
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
              onClick={() => navigate("/settings")}
              aria-label="Settings"
              className="h-9 w-9"
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