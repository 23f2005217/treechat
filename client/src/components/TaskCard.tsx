/**
 * TaskCard Component
 * 
 * A modular, interactive task card with CRUD operations.
 * Displays task information with energy levels, priority, and quick actions.
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
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Pin,
  Tag,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

export interface Task {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  time?: string;
  minutes?: number;
  priority?: "high" | "medium" | "low";
  energy?: "high" | "medium" | "low";
  completed?: boolean;
  pinned?: boolean;
  tags?: string[];
  warning?: string;
  createdAt?: Date;
  dueDate?: Date;
}

interface TaskCardProps {
  task: Task;
  variant?: "default" | "compact" | "detailed";
  onComplete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onReschedule?: (taskId: string, when: string) => void;
  onPin?: (taskId: string) => void;
  onClick?: (task: Task) => void;
  className?: string;
}

const ENERGY_CONFIG = {
  high: { 
    icon: Zap, 
    color: "text-amber-500", 
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    label: "High Energy" 
  },
  medium: { 
    icon: Clock, 
    color: "text-blue-500", 
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    label: "Medium" 
  },
  low: { 
    icon: CheckCircle2, 
    color: "text-green-500", 
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    label: "Quick Win" 
  },
};

const PRIORITY_CONFIG = {
  high: { color: "text-red-600 bg-red-50 border-red-200", label: "High" },
  medium: { color: "text-amber-600 bg-amber-50 border-amber-200", label: "Medium" },
  low: { color: "text-slate-600 bg-slate-50 border-slate-200", label: "Low" },
};

export function TaskCard({
  task,
  variant = "default",
  onComplete,
  onEdit,
  onDelete,
  onReschedule,
  onPin,
  onClick,
  className,
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const energy = task.energy || (task.minutes && task.minutes <= 10 ? "low" : task.minutes && task.minutes >= 60 ? "high" : "medium");
  const energyConfig = ENERGY_CONFIG[energy];
  const EnergyIcon = energyConfig.icon;

  const priority = task.priority || "medium";
  const priorityConfig = PRIORITY_CONFIG[priority];

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCompleting(true);
    onComplete?.(task.id);
    
    setTimeout(() => {
      setIsCompleting(false);
    }, 500);
  };

  const handleReschedule = (when: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onReschedule?.(task.id, when);
    setIsExpanded(false);
  };

  // Compact variant
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "group flex items-center gap-3 p-2 rounded-lg border bg-card",
          "hover:shadow-sm transition-all cursor-pointer",
          task.completed && "opacity-60",
          task.pinned && "border-primary/50 bg-primary/5",
          className
        )}
        onClick={() => onClick?.(task)}
      >
        {/* Complete checkbox */}
        <button
          onClick={handleComplete}
          className={cn(
            "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
            task.completed 
              ? "bg-primary border-primary text-primary-foreground" 
              : "border-muted-foreground/30 hover:border-primary"
          )}
        >
          {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
        </button>

        {/* Icon */}
        {task.icon && (
          <span className="flex-shrink-0 text-lg">{task.icon}</span>
        )}

        {/* Title */}
        <span className={cn(
          "flex-1 text-sm truncate",
          task.completed && "line-through text-muted-foreground"
        )}>
          {task.title}
        </span>

        {/* Meta */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {task.time && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.time}
            </span>
          )}
          {task.minutes && (
            <span className={cn("flex items-center gap-1", energyConfig.color)}>
              <EnergyIcon className="w-3 h-3" />
              {task.minutes}m
            </span>
          )}
        </div>
      </div>
    );
  }

  // Detailed variant
  if (variant === "detailed") {
    return (
      <div
        className={cn(
          "rounded-xl border bg-card overflow-hidden transition-all",
          "hover:shadow-md",
          task.pinned && "border-primary/50",
          task.warning && "border-destructive/50",
          className
        )}
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Complete button */}
            <button
              onClick={handleComplete}
              className={cn(
                "flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                task.completed 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
              )}
            >
              {task.completed && <CheckCircle2 className="w-4 h-4" />}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                {task.icon && (
                  <span className="text-2xl">{task.icon}</span>
                )}
                <div className="flex-1">
                  <h3 className={cn(
                    "font-semibold text-lg",
                    task.completed && "line-through text-muted-foreground"
                  )}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {task.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                {/* Energy level */}
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full border",
                  energyConfig.bgColor,
                  energyConfig.borderColor,
                  energyConfig.color
                )}>
                  <EnergyIcon className="w-4 h-4" />
                  <span className="font-medium">{energyConfig.label}</span>
                  {task.minutes && (
                    <span className="opacity-70">({task.minutes}m)</span>
                  )}
                </div>

                {/* Priority */}
                <Badge variant="outline" className={cn("text-xs", priorityConfig.color)}>
                  {priorityConfig.label} Priority
                </Badge>

                {/* Due date */}
                {task.time && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{task.time}</span>
                  </div>
                )}

                {/* Warning */}
                {task.warning && (
                  <div className="flex items-center gap-1.5 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{task.warning}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1">
              {onPin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    task.pinned && "text-primary"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPin(task.id);
                  }}
                >
                  <Pin className={cn("w-4 h-4", task.pinned && "fill-current")} />
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions footer */}
        {(onReschedule || task.warning) && (
          <div className="px-4 py-3 bg-muted/30 border-t flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Quick actions:</span>
            {onReschedule && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => handleReschedule("tomorrow", e)}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Tomorrow
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => handleReschedule("next_week", e)}
                >
                  Next Week
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-3 transition-all",
        "hover:shadow-md cursor-pointer",
        task.pinned && "border-primary/50 bg-primary/5",
        task.warning && "border-destructive/50 bg-destructive/5",
        isCompleting && "opacity-50 scale-95",
        className
      )}
      onClick={() => onClick?.(task)}
    >
      <div className="flex items-start gap-3">
        {/* Complete button */}
        <button
          onClick={handleComplete}
          className={cn(
            "flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
            task.completed 
              ? "bg-primary border-primary text-primary-foreground" 
              : "border-muted-foreground/30 hover:border-primary"
          )}
        >
          {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
        </button>

        {/* Icon */}
        {task.icon && (
          <span className="flex-shrink-0 text-xl">{task.icon}</span>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <p className={cn(
              "text-sm font-medium leading-tight",
              task.completed && "line-through text-muted-foreground"
            )}>
              {task.title}
            </p>
            {task.pinned && (
              <Pin className="w-3 h-3 text-primary fill-current flex-shrink-0" />
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            {task.time && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {task.time}
              </span>
            )}
            {task.minutes && (
              <span className={cn("flex items-center gap-1", energyConfig.color)}>
                <EnergyIcon className="w-3 h-3" />
                {task.minutes}m
              </span>
            )}
            {priority !== "medium" && (
              <Badge variant="outline" className={cn("text-[10px] h-5", priorityConfig.color)}>
                {priorityConfig.label}
              </Badge>
            )}
          </div>

          {/* Warning */}
          {task.warning && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-destructive">
              <AlertTriangle className="w-3 h-3" />
              {task.warning}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <MoreHorizontal className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded actions */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {onReschedule && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={(e) => handleReschedule("tomorrow", e)}
                >
                  Tomorrow
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={(e) => handleReschedule("later", e)}
                >
                  Later
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={(e) => handleReschedule("next_week", e)}
                >
                  Next Week
                </Button>
              </>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
