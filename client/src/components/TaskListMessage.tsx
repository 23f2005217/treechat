/**
 * TaskListMessage - Renders structured task lists in chat
 * 
 * Displays tasks as interactive cards with:
 * - Domain icons
 * - Energy level indicators
 * - Quick actions (complete, reschedule)
 * - Decay warnings
 * - Soft priority highlights
 */

import { useState } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Zap, 
  AlertTriangle,
  Calendar,
  MoreHorizontal,
  ChevronRight,
  X
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

export interface TaskItem {
  id: string;
  icon: string;
  title: string;
  time: string;
  minutes?: number;
  highlight: boolean;
  warning?: string;
  completed?: boolean;
}

interface TaskListMessageProps {
  tasks: TaskItem[];
  count: number;
  summaryType: string;
  suggestions?: string[];
  decayAlerts?: string[];
  onCompleteTask?: (taskId: string) => void;
  onRescheduleTask?: (taskId: string, intent: string) => void;
  onTaskClick?: (task: TaskItem) => void;
}

const ENERGY_ICONS: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  high: { icon: Zap, color: "text-destructive", label: "High energy" },
  medium: { icon: Clock, color: "text-primary", label: "Medium" },
  low: { icon: CheckCircle2, color: "text-accent", label: "Quick win" },
};

export function TaskListMessage({
  tasks,
  count,
  summaryType,
  suggestions = [],
  decayAlerts = [],
  onCompleteTask,
  onRescheduleTask,
  onTaskClick,
}: TaskListMessageProps) {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());

  const handleComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletingTasks(prev => new Set(prev).add(taskId));
    onCompleteTask?.(taskId);
    
    // Visual feedback delay
    setTimeout(() => {
      setCompletingTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, 500);
  };

  const handleReschedule = (taskId: string, intent: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onRescheduleTask?.(taskId, intent);
    setExpandedTask(null);
  };

  const getEnergyLevel = (minutes?: number): keyof typeof ENERGY_ICONS => {
    if (!minutes || minutes <= 10) return "low";
    if (minutes >= 60) return "high";
    return "medium";
  };

  return (
    <div className="space-y-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">
            {count} {count === 1 ? "task" : "tasks"}
          </span>
          <Badge variant="secondary" className="text-xs">
            {summaryType.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.map((task, index) => {
          const energy = getEnergyLevel(task.minutes);
          const EnergyIcon = ENERGY_ICONS[energy].icon;
          const isCompleting = completingTasks.has(task.id);
          const isExpanded = expandedTask === task.id;

          return (
            <div
              key={task.id}
              className={cn(
                "group relative rounded-lg border bg-card p-3 transition-all",
                "hover:shadow-md cursor-pointer",
                task.highlight && "border-accent bg-accent/10",
                task.warning && "border-destructive bg-destructive/10",
                isCompleting && "opacity-50 scale-95"
              )}
              onClick={() => onTaskClick?.(task)}
            >
              <div className="flex items-start gap-3">
                {/* Domain Icon */}
                <div className="flex-shrink-0 text-xl">{task.icon}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className={cn(
                      "text-sm font-medium leading-tight",
                      task.highlight && "text-accent-foreground"
                    )}>
                      {task.title}
                    </p>
                    {task.highlight && (
                      <Badge variant="outline" className="text-[10px] border-accent text-accent-foreground shrink-0">
                        Important
                      </Badge>
                    )}
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {task.time}
                    </span>
                    {task.minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.minutes} min
                      </span>
                    )}
                    <span className={cn("flex items-center gap-1", ENERGY_ICONS[energy].color)}>
                      <EnergyIcon className="w-3 h-3" />
                      {ENERGY_ICONS[energy].label}
                    </span>
                  </div>

                  {/* Decay Warning */}
                  {task.warning && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-3 h-3" />
                      {task.warning}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Complete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleComplete(task.id, e)}
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </Button>

                  {/* Expand/Actions Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedTask(isExpanded ? null : task.id);
                    }}
                  >
                    {isExpanded ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <MoreHorizontal className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expanded Actions */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={(e) => handleReschedule(task.id, "tomorrow", e)}
                    >
                      Do tomorrow
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={(e) => handleReschedule(task.id, "later", e)}
                    >
                      Do later
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={(e) => handleReschedule(task.id, "next_week", e)}
                    >
                      Next week
                    </Button>
                    {task.warning && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Delete/archive task
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
            <div className="space-y-1">
              {suggestions.map((suggestion, i) => (
                <p key={i} className="text-sm text-accent-foreground">
                  {suggestion}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Decay Alerts */}
      {decayAlerts.length > 0 && (
        <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1">
              {decayAlerts.map((alert, i) => (
                <p key={i} className="text-sm text-destructive">
                  {alert}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Show more if truncated */}
      {count > tasks.length && (
        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
          Show {count - tasks.length} more tasks
          <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
}
