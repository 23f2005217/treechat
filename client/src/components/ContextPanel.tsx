import { Pin, CheckSquare, Calendar } from "lucide-react";
import { Badge } from "./ui/badge";
import type { ContextItem } from "../types/chat";

interface ContextPanelProps {
  contextItems: ContextItem[];
  isCollapsed: boolean;
  onToggle: () => void;
}

export function ContextPanel({ contextItems, isCollapsed, onToggle }: ContextPanelProps) {
  if (isCollapsed) {
    return (
      <div className="w-12 border-l bg-muted/50 flex items-center justify-center">
        <button
          onClick={onToggle}
          className="p-2 hover:bg-accent rounded-lg"
          aria-label="Expand context panel"
        >
          <Pin className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-muted/50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Active Context</h3>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-accent rounded"
          aria-label="Collapse context panel"
        >
          <Pin className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {contextItems.map((item) => (
          <div key={item.id} className="p-3 bg-card rounded-lg border shadow-sm">
            <div className="flex items-start gap-2 mb-2">
              {item.type === "pinned" && (
                <Pin className="h-4 w-4 text-blue-500" />
              )}
              {item.type === "checkpoint" && (
                <CheckSquare className="h-4 w-4 text-green-500" />
              )}
              {item.type === "task" && (
                <Calendar className="h-4 w-4 text-orange-500" />
              )}
              
              <Badge 
                variant={item.type === "pinned" ? "default" : "secondary"}
                className="text-xs"
              >
                {item.type}
              </Badge>
            </div>

            <h4 className="font-medium text-foreground text-sm mb-1">
              {item.title}
            </h4>
            
            <p className="text-muted-foreground text-xs mb-2">
              {item.content}
            </p>

            <div className="text-xs text-muted-foreground">
              {item.timestamp.toLocaleDateString()}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {contextItems.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Pin className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No active context</p>
            <p className="text-xs">Pin messages or create tasks to see them here</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t text-xs text-muted-foreground bg-muted">
        <div className="flex justify-between items-center">
          <span>Memory usage</span>
          <span className="font-mono">1.2MB / 5MB</span>
        </div>
        <div className="w-full bg-border rounded-full h-1 mt-1">
          <div 
            className="bg-primary h-1 rounded-full" 
            style={{ width: '24%' }}
          />
        </div>
      </div>
    </div>
  );
}