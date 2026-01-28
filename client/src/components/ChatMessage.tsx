import { useState, memo } from "react";
import { Copy, Pin, GitFork, ClipboardList, Check, Reply, Bot, User, Bell, Calendar, Tag } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { MarkdownContent } from "./MarkdownContent";
import { cn } from "../lib/utils";

interface ChatMessageProps {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isCheckpoint?: boolean;
  onCopy: (content: string) => void;
  onPin: (messageId: string) => void;
  onFork: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onCreateTask: (messageId: string) => void;
  onTagAsTask?: (messageId: string, tag: string) => void;
}

export const ChatMessage = memo(function ChatMessage({
  id,
  role,
  content,
  timestamp,
  isCheckpoint = false,
  onCopy,
  onPin,
  onFork,
  onReply,
  onCreateTask,
  onTagAsTask,
}: ChatMessageProps) {
  const isUser = role === "user";
  const isSystem = role === "system";
  const [copied, setCopied] = useState(false);
  const timeString = timestamp.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy(content);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  // System messages have a different style
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="px-3 py-1.5 bg-muted/50 rounded-full text-xs text-muted-foreground">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-3 group",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser 
          ? "bg-muted-foreground text-background" 
          : "bg-muted text-muted-foreground"
      )}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message content */}
      <div className={cn(
        "flex flex-col gap-1 max-w-[80%] sm:max-w-[75%]",
        isUser ? "items-end" : "items-start"
      )}>
        {/* Message bubble */}
        <div
          className={cn(
            "relative px-4 py-3 shadow-sm transition-all",
            isUser
              ? "bg-secondary text-secondary-foreground rounded-2xl rounded-tr-sm"
              : "bg-card text-card-foreground border border-border rounded-2xl rounded-tl-sm",
            isCheckpoint && "bg-accent/30 border-accent"
          )}
        >
          {/* Checkpoint indicator */}
          {isCheckpoint && (
            <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-accent-foreground">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Checkpoint
            </div>
          )}

          {/* Message content */}
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>
          ) : (
            <MarkdownContent content={content} className="text-sm leading-relaxed" />
          )}
        </div>

        {/* Timestamp and actions row */}
        <div className={cn(
          "flex items-center gap-1",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          {/* Timestamp */}
          <span className="text-xs text-muted-foreground px-1">
            {timeString}
          </span>

          {/* Message actions - visible on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopy}
                  aria-label={copied ? "Copied!" : "Copy message"}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{copied ? "Copied!" : "Copy"}</TooltipContent>
            </Tooltip>

            {onReply && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onReply(id)}
                    aria-label="Reply to message"
                  >
                    <Reply className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Reply</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onFork(id)}
                  aria-label="Fork thread from here"
                >
                  <GitFork className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Fork from here</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onPin(id)}
                  aria-label="Pin to context"
                >
                  <Pin className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Pin</TooltipContent>
            </Tooltip>

            {/* Tag as Task/Reminder Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label="Tag as task or reminder"
                >
                  <Tag className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onTagAsTask?.(id, "task")}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Tag as @task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTagAsTask?.(id, "reminder")}>
                  <Bell className="h-4 w-4 mr-2" />
                  Tag as @reminder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTagAsTask?.(id, "event")}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Tag as @event
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateTask(id)}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Create task from message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
});
