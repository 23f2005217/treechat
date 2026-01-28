/**
 * SmartChatMessage - Enhanced chat message that renders different content types
 * 
 * Handles:
 * - Regular text messages (markdown)
 * - Structured task lists (TaskListMessage)
 * - Undoable action confirmations
 * - Suggestions and tips
 */

import { memo } from "react";
import { Bot, User, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { MarkdownContent } from "./MarkdownContent";
import { TaskListMessage, type TaskItem } from "./TaskListMessage";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export interface StructuredData {
  type: string;
  summary_type: string;
  count: number;
  tasks: TaskItem[];
  suggestions?: string[];
  decay_alerts?: string[];
}

export interface SmartChatMessageProps {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  structuredData?: StructuredData;
  responseType?: "text" | "structured_list" | "undoable_action";
  undoToken?: string;
  onCompleteTask?: (taskId: string) => void;
  onRescheduleTask?: (taskId: string, intent: string) => void;
  onUndo?: (token: string) => void;
  onTaskClick?: (task: TaskItem) => void;
}

export const SmartChatMessage = memo(function SmartChatMessage({
  id,
  role,
  content,
  timestamp,
  structuredData,
  responseType,
  undoToken,
  onCompleteTask,
  onRescheduleTask,
  onUndo,
  onTaskClick,
}: SmartChatMessageProps) {
  const isUser = role === "user";
  const isAssistant = role === "assistant";
  const timeString = timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // System messages
  if (role === "system") {
    return (
      <div className="flex justify-center my-2">
        <div className="px-3 py-1.5 bg-muted/50 rounded-full text-xs text-muted-foreground">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3 group",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[85%] sm:max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Message bubble */}
        <div
          className={cn(
            "relative px-4 py-3 shadow-sm transition-all",
            isUser
              ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
              : "bg-card text-card-foreground border border-border rounded-2xl rounded-tl-sm",
            // Highlight structured responses
            responseType === "structured_list" && "border-l-4 border-l-primary",
            responseType === "undoable_action" && "border-l-4 border-l-destructive"
          )}
        >
          {/* Response type indicator */}
          {isAssistant && responseType && (
            <div className="flex items-center gap-2 mb-2">
              {responseType === "structured_list" && (
                <Badge variant="outline" className="text-[10px] h-5">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Task List
                </Badge>
              )}
              {responseType === "undoable_action" && undoToken && (
                <Badge variant="outline" className="text-[10px] h-5 border-destructive text-destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Can Undo
                </Badge>
              )}
            </div>
          )}

          {/* Content based on type */}
          {responseType === "structured_list" && structuredData ? (
            <TaskListMessage
              tasks={structuredData.tasks}
              count={structuredData.count}
              summaryType={structuredData.summary_type}
              suggestions={structuredData.suggestions}
              decayAlerts={structuredData.decay_alerts}
              onCompleteTask={onCompleteTask}
              onRescheduleTask={onRescheduleTask}
              onTaskClick={onTaskClick}
            />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownContent content={content} />
            </div>
          )}

          {/* Undo button for undoable actions */}
          {responseType === "undoable_action" && undoToken && onUndo && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => onUndo(undoToken)}
              >
                Undo this action
              </Button>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground px-1">{timeString}</span>
      </div>
    </div>
  );
});
