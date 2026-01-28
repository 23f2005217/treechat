/**
 * EnhancedChatComposer Component
 * 
 * A mini-CLI enabled chat composer with:
 * - @command support for tasks, reminders, and events
 * - Interactive command suggestions
 * - CRUD operations through natural CLI syntax
 * - Modular architecture
 */

import { useRef, useCallback, useEffect } from "react";
import { Send, Paperclip, GitFork, X, CornerDownLeft, Terminal } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { cn } from "../lib/utils";
import { useCLICommands } from "../hooks/useCLICommands";
import { CommandSuggestions } from "./CommandSuggestions";
import type { ParseResult } from "../lib/cli";

interface EnhancedChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onCommand?: (parsed: ParseResult) => Promise<void>;
  disabled?: boolean;
  replyTo?: string | null;
  onCancelReply?: () => void;
  onForkThread?: () => void;
}

export function EnhancedChatComposer({
  value,
  onChange,
  onSend,
  onCommand,
  disabled = false,
  replyTo = null,
  onCancelReply,
  onForkThread,
}: EnhancedChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    input,
    setInput,
    parsed,
    isCommand,
    suggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    insertSuggestion,
    executeCommand,
    showSuggestions,
    setShowSuggestions,
  } = useCLICommands(onCommand);

  // Sync external value with internal input
  useEffect(() => {
    if (value !== input) {
      setInput(value);
    }
  }, [value]);

  // Update external value when input changes
  const handleInputChange = useCallback((newValue: string) => {
    setInput(newValue);
    onChange(newValue);
    
    // Show suggestions when typing @
    if (newValue.includes("@")) {
      setShowSuggestions(true);
    }
  }, [setInput, onChange, setShowSuggestions]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle suggestion navigation
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const newIndex = selectedSuggestionIndex < suggestions.length - 1
          ? selectedSuggestionIndex + 1
          : 0;
        setSelectedSuggestionIndex(newIndex);
        return;
      }
      
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const newIndex = selectedSuggestionIndex > 0
          ? selectedSuggestionIndex - 1
          : suggestions.length - 1;
        setSelectedSuggestionIndex(newIndex);
        return;
      }
      
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertSuggestion(suggestions[selectedSuggestionIndex]);
        return;
      }
      
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    // Handle send
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      
      // If it's a complete command, execute it
      if (isCommand && parsed?.type && parsed?.action) {
        executeCommand();
      } else if (value.trim() && !disabled) {
        onSend();
      }
    }
  };

  const handleSend = () => {
    if (isCommand && parsed?.type && parsed?.action) {
      executeCommand();
    } else if (value.trim() && !disabled) {
      onSend();
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
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
      
      {/* Command preview bar */}
      {isCommand && parsed && (
        <div className={cn(
          "mb-2 px-3 py-2 rounded-lg border flex items-center gap-2 text-sm",
          parsed.type && parsed.action 
            ? "bg-green-500/10 border-green-500/30 text-green-700" 
            : "bg-blue-500/10 border-blue-500/30 text-blue-700"
        )}>
          <Terminal className="w-4 h-4" />
          <span className="font-mono">
            {parsed.type ? `@${parsed.type}` : "@?"}
            {parsed.action ? ` ${parsed.action}` : ""}
          </span>
          {parsed.type && parsed.action && (
            <span className="text-xs opacity-70 ml-auto">
              Press Enter to execute
            </span>
          )}
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
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... Use @task, @reminder, @event for quick actions (Shift+Enter for new line)"
            className={cn(
              "min-h-[44px] max-h-[200px] resize-none py-3 pr-2 text-sm",
              "focus-visible:ring-1 focus-visible:ring-primary",
              disabled && "opacity-50 cursor-not-allowed",
              isCommand && "font-mono"
            )}
            disabled={disabled}
            rows={1}
          />

          {/* Command suggestions */}
          {showSuggestions && (
            <CommandSuggestions
              suggestions={suggestions}
              selectedIndex={selectedSuggestionIndex}
              onSelect={(suggestion) => {
                insertSuggestion(suggestion);
                // Focus back on textarea
                setTimeout(() => textareaRef.current?.focus(), 0);
              }}
              onClose={() => setShowSuggestions(false)}
            />
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
              aria-label={isCommand ? "Execute command" : "Send message"}
            >
              {isCommand ? (
                <Terminal className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isCommand ? "Execute command" : "Send message"} (Enter)
          </TooltipContent>
        </Tooltip>
      </div>
      
      {/* Quick command hints */}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Terminal className="w-3 h-3" />
          Quick commands:
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const newValue = value + "@task add ";
              handleInputChange(newValue);
              textareaRef.current?.focus();
            }}
            className="px-2 py-0.5 bg-muted hover:bg-muted/80 rounded font-mono transition-colors"
          >
            @task add
          </button>
          <button
            onClick={() => {
              const newValue = value + "@reminder add ";
              handleInputChange(newValue);
              textareaRef.current?.focus();
            }}
            className="px-2 py-0.5 bg-muted hover:bg-muted/80 rounded font-mono transition-colors"
          >
            @reminder add
          </button>
          <button
            onClick={() => {
              const newValue = value + "@task list";
              handleInputChange(newValue);
              textareaRef.current?.focus();
            }}
            className="px-2 py-0.5 bg-muted hover:bg-muted/80 rounded font-mono transition-colors"
          >
            @task list
          </button>
        </div>
      </div>

      {/* Character count for long messages */}
      {value.length > 500 && (
        <div className="mt-1 text-xs text-muted-foreground text-right">
          {value.length} characters
        </div>
      )}
    </div>
  );
}
