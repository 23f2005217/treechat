import { Copy, Pin, Forklift, ClipboardList } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Badge } from "./ui/badge";

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
}

export function ChatMessage({
  id,
  role,
  content,
  timestamp,
  isCheckpoint = false,
  onCopy,
  onPin,
  onFork,
  onCreateTask,
}: ChatMessageProps) {
  const isUser = role === "user";
  const timeString = timestamp.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} group`}>
      <div className={`flex max-w-[80%] flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
        {/* Role badge */}
        {!isUser && !isCheckpoint && (
          <Badge variant="secondary" className="text-xs font-normal">
            {role}
          </Badge>
        )}

        {/* Message bubble */}
        <div
          className={`
            rounded-2xl px-4 py-3 shadow-sm border
            ${isUser
              ? "bg-primary text-primary-foreground border-primary/20"
              : "bg-background text-foreground border-border"
            }
            ${isCheckpoint ? "bg-accent/50 border-accent" : ""}
          `}
        >
          {/* Checkpoint badge */}
          {isCheckpoint && (
            <Badge variant="default" className="mb-2">
              Checkpoint
            </Badge>
          )}

          {/* Message content */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>

          {/* Timestamp */}
          <div className={`text-xs mt-2 ${isUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {timeString}
          </div>
        </div>

        {/* Message actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onCopy(content)}
                aria-label="Copy message"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>

          {/* Reply */}
          {onReply && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onReply(id)}
                  aria-label="Reply to message"
                >
                  {/* small reply arrow */}
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14L2 6l8-8" transform="translate(6 6)"/></svg>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reply</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onFork(id)}
                aria-label="Fork thread from here"
              >
                <Forklift className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fork thread</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onPin(id)}
                aria-label="Pin to context"
              >
                <Pin className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pin to context</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onCreateTask(id)}
                aria-label="Create task from message"
              >
                <ClipboardList className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create task</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
