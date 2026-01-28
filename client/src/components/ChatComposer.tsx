import { useRef, useEffect, useCallback, useState } from "react";
import { Send, Paperclip, GitFork, X, CornerDownLeft, ClipboardList, Bell, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { cn } from "../lib/utils";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  replyTo?: string | null;
  onCancelReply?: () => void;
  onForkThread?: () => void;
}

// Tag suggestions for @ mentions
const TAG_SUGGESTIONS = [
  { id: "task", label: "task", icon: ClipboardList, description: "Mark as a task" },
  { id: "reminder", label: "reminder", icon: Bell, description: "Set a reminder" },
  { id: "event", label: "event", icon: Calendar, description: "Mark as an event" },
];

export function ChatComposer({ value, onChange, onSend, disabled = false, replyTo = null, onCancelReply, onForkThread }: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200); // Max height of 200px
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  // Check for @ mentions
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    setCursorPosition(cursorPos);

    // Find if we're typing after @
    const textBeforeCursor = value.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@(\w*)$/);

    if (match) {
      setSuggestionQuery(match[1].toLowerCase());
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  }, [value]);

  const filteredSuggestions = TAG_SUGGESTIONS.filter(tag =>
    tag.label.toLowerCase().includes(suggestionQuery)
  );

  const insertTag = (tagLabel: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);

    // Replace the @query with the selected tag
    const newTextBefore = textBeforeCursor.replace(/@\w*$/, `@${tagLabel} `);
    const newValue = newTextBefore + textAfterCursor;

    onChange(newValue);
    setShowSuggestions(false);

    // Focus back on textarea after insertion
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = newTextBefore.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertTag(filteredSuggestions[selectedIndex].label);
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
      }
    }
  };

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend();
      // Reset textarea height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  // Highlight @tags in the textarea display
  const renderHighlightedText = () => {
    const parts = value.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span key={index} className="text-primary font-semibold bg-primary/10 px-1 rounded">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="border-t bg-background p-3 sm:p-4 shrink-0">
      {/* Reply indicator */}
      {replyTo && (
        <div className="mb-2 p-2 bg-muted/50 rounded-lg flex items-center justify-between border border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CornerDownLeft className="h-4 w-4" />
            <span>Replying to message</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onCancelReply}
            className="h-6 w-6"
            aria-label="Cancel reply"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      
      <div className="flex items-end gap-2 sm:gap-3">
        {/* Attachment button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 text-muted-foreground hover:text-foreground"
              disabled={true}
              aria-label="Add attachment (coming soon)"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Attachments coming soon</TooltipContent>
        </Tooltip>

        {/* Textarea with suggestions */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... Use @task, @reminder, @event (Shift+Enter for new line)"
            className={cn(
              "min-h-[44px] max-h-[200px] resize-none py-3 pr-2 text-sm",
              "focus-visible:ring-1 focus-visible:ring-primary",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
            rows={1}
          />

          {/* Tag suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border">
                Select tag...
              </div>
              {filteredSuggestions.map((tag, index) => {
                const Icon = tag.icon;
                return (
                  <button
                    key={tag.id}
                    onClick={() => insertTag(tag.label)}
                    className={cn(
                      "w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-accent transition-colors",
                      index === selectedIndex && "bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">@{tag.label}</span>
                      <span className="text-xs text-muted-foreground">{tag.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Fork thread button */}
        {onForkThread && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onForkThread}
                disabled={disabled}
                className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Fork entire thread"
              >
                <GitFork className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fork thread</TooltipContent>
          </Tooltip>
        )}

        {/* Send button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleSend}
              disabled={disabled || !value.trim()}
              size="icon"
              className={cn(
                "h-9 w-9 sm:h-10 sm:w-10 shrink-0 transition-all",
                value.trim() && !disabled && "bg-primary hover:bg-primary/90"
              )}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Send message (Enter)</TooltipContent>
        </Tooltip>
      </div>
      
      {/* Character count for long messages */}
      {value.length > 500 && (
        <div className="mt-1 text-xs text-muted-foreground text-right">
          {value.length} characters
        </div>
      )}

      {/* Quick tag hints */}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Quick tags:</span>
        {TAG_SUGGESTIONS.map((tag) => {
          const Icon = tag.icon;
          return (
            <button
              key={tag.id}
              onClick={() => {
                const textarea = textareaRef.current;
                if (textarea) {
                  const cursorPos = textarea.selectionStart;
                  const newValue = value.slice(0, cursorPos) + `@${tag.label} ` + value.slice(cursorPos);
                  onChange(newValue);
                  textarea.focus();
                }
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted hover:bg-muted/80 rounded transition-colors"
            >
              <Icon className="h-3 w-3" />
              @{tag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
