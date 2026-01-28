import { Copy, Pin, Forklift, ClipboardList } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Badge } from "./ui/badge";
import { MarkdownContent } from "./MarkdownContent";

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
  onReply,
  onCreateTask,
}: ChatMessageProps) {
  const isUser = role === "user";
  const timeString = timestamp.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} group`}>
      <div className={`flex max-w-[85%] flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
        {/* Role badge */}
        {!isUser && !isCheckpoint && (
          <Badge variant="secondary" className="text-xs font-normal mb-0.5">
            {role}
          </Badge>
        )}

        {/* Message bubble */}
        <div
          className={`
            relative px-4 py-3 shadow-sm transition-all hover:shadow-md
            ${isUser
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-tr-md"
              : "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 text-foreground border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-md"
            }
            ${isCheckpoint ? "bg-accent/50 border-accent rounded-xl" : ""}
          `}
        >
          {/* Checkpoint badge */}
          {isCheckpoint && (
            <Badge variant="default" className="mb-2">
              Checkpoint
            </Badge>
          )}

          {/* Message content */}
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            <MarkdownContent content={content} className="text-sm leading-relaxed" />
          )}

          {/* Timestamp */}
          <div className={`text-xs mt-2 ${isUser ? "text-white/80" : "text-muted-foreground"}`}>
            {timeString}
          </div>
        </div>

        {/* Message actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onCopy(content)}
                aria-label="Copy message"
              >
                <Copy className="h-3.5 w-3.5" />
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
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14L2 6l8-8" transform="translate(6 6)"/></svg>
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
                <Forklift className="h-3.5 w-3.5" />
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
                <Pin className="h-3.5 w-3.5" />
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
                <ClipboardList className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create task</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
