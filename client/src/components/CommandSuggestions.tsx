/**
 * CommandSuggestions Component
 * 
 * Displays interactive command suggestions with keyboard navigation.
 * Supports type, action, and option suggestions.
 */

import { useRef, useEffect } from "react";
import { 
  Terminal, 
  Command, 
  Settings, 
  Lightbulb,
  type LucideIcon 
} from "lucide-react";
import { cn } from "../lib/utils";
import type { Suggestion } from "../hooks/useCLICommands";

interface CommandSuggestionsProps {
  suggestions: Suggestion[];
  selectedIndex: number;
  onSelect: (suggestion: Suggestion) => void;
  onClose: () => void;
}

const typeIcons: Record<string, LucideIcon> = {
  type: Command,
  action: Terminal,
  option: Settings,
  example: Lightbulb,
};

const typeColors: Record<string, string> = {
  type: "bg-blue-500/10 text-blue-600 border-blue-200",
  action: "bg-green-500/10 text-green-600 border-green-200",
  option: "bg-orange-500/10 text-orange-600 border-orange-200",
  example: "bg-purple-500/10 text-purple-600 border-purple-200",
};

export function CommandSuggestions({
  suggestions,
  selectedIndex,
  onSelect,
  onClose,
}: CommandSuggestionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current && containerRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (suggestions.length === 0) return null;

  // Group suggestions by type
  const grouped = suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.type]) {
      acc[suggestion.type] = [];
    }
    acc[suggestion.type].push(suggestion);
    return acc;
  }, {} as Record<string, Suggestion[]>);

  const typeOrder = ["type", "action", "option", "example"];

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Commands
        </span>
        <span className="text-xs text-muted-foreground">
          {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Suggestion groups */}
      <div className="max-h-72 overflow-y-auto py-1">
        {typeOrder.map((type) => {
          const groupSuggestions = grouped[type];
          if (!groupSuggestions || groupSuggestions.length === 0) return null;

          return (
            <div key={type} className="mb-1 last:mb-0">
              {/* Group header */}
              <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {type === "type" && "Types"}
                {type === "action" && "Actions"}
                {type === "option" && "Options"}
                {type === "example" && "Examples"}
              </div>

              {/* Suggestions */}
              {groupSuggestions.map((suggestion, groupIndex) => {
                const globalIndex = suggestions.findIndex(s => s.id === suggestion.id);
                const isSelected = globalIndex === selectedIndex;
                const Icon = suggestion.icon || typeIcons[type];
                const colorClass = typeColors[type];

                return (
                  <button
                    key={suggestion.id}
                    ref={isSelected ? selectedRef : null}
                    onClick={() => onSelect(suggestion)}
                    className={cn(
                      "w-full px-3 py-2 flex items-start gap-3 text-left transition-colors",
                      "hover:bg-accent/50 focus:bg-accent/50 focus:outline-none",
                      isSelected && "bg-accent"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center",
                      colorClass
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {suggestion.label}
                        </span>
                        {type === "example" && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                            Example
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.description}
                      </p>
                      {type === "example" && (
                        <code className="mt-1 block text-xs bg-muted px-2 py-1 rounded text-foreground font-mono">
                          {suggestion.insertText}
                        </code>
                      )}
                    </div>

                    {/* Shortcut hint */}
                    {isSelected && (
                      <div className="flex-shrink-0 text-xs text-muted-foreground">
                        ↵
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer with keyboard hints */}
      <div className="px-3 py-2 bg-muted/30 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-background border rounded">↑↓</kbd>
          Navigate
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-background border rounded">↵</kbd>
          Select
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-background border rounded">Esc</kbd>
          Close
        </span>
      </div>
    </div>
  );
}
