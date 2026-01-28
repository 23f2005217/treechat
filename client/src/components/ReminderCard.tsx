/**
 * ReminderCard Component
 * 
 * A modular, interactive reminder card with CRUD operations.
 * Displays reminder information with repeat patterns and snooze options.
 */

import { useState } from "react";
import {
  Bell,
  Clock,
  Repeat,
  MoreHorizontal,
  Edit3,
  Trash2,
  ChevronUp,
  CheckCircle2,
  X,
  AlertCircle,
  Clock3,
} from "lucide-react";

// Snooze icon alias
const Snooze = Clock3;
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

export interface Reminder {
  id: string;
  title: string;
  time: string;
  repeat?: "none" | "daily" | "weekly" | "monthly" | "custom";
  customRepeat?: string;
  completed?: boolean;
  snoozed?: boolean;
  snoozeUntil?: string;
  priority?: "high" | "normal" | "low";
  category?: string;
  createdAt?: Date;
}

interface ReminderCardProps {
  reminder: Reminder;
  variant?: "default" | "compact" | "detailed";
  onComplete?: (reminderId: string) => void;
  onEdit?: (reminder: Reminder) => void;
  onDelete?: (reminderId: string) => void;
  onSnooze?: (reminderId: string, duration: string) => void;
  onDismiss?: (reminderId: string) => void;
  onClick?: (reminder: Reminder) => void;
  className?: string;
}

const REPEAT_CONFIG = {
  none: { icon: Bell, label: "Once", color: "text-slate-500" },
  daily: { icon: Repeat, label: "Daily", color: "text-blue-500" },
  weekly: { icon: Repeat, label: "Weekly", color: "text-green-500" },
  monthly: { icon: Repeat, label: "Monthly", color: "text-purple-500" },
  custom: { icon: Repeat, label: "Custom", color: "text-orange-500" },
};

const PRIORITY_CONFIG = {
  high: { color: "text-red-600 bg-red-50 border-red-200", label: "High" },
  normal: { color: "text-blue-600 bg-blue-50 border-blue-200", label: "Normal" },
  low: { color: "text-slate-600 bg-slate-50 border-slate-200", label: "Low" },
};

const SNOOZE_OPTIONS = [
  { label: "10 min", value: "10min" },
  { label: "30 min", value: "30min" },
  { label: "1 hour", value: "1hour" },
  { label: "Tomorrow", value: "tomorrow" },
];

export function ReminderCard({
  reminder,
  variant = "default",
  onComplete,
  onEdit,
  onDelete,
  onSnooze,
  onDismiss,
  onClick,
  className,
}: ReminderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

  const repeat = reminder.repeat || "none";
  const repeatConfig = REPEAT_CONFIG[repeat];
  const RepeatIcon = repeatConfig.icon;

  const priority = reminder.priority || "normal";
  const priorityConfig = PRIORITY_CONFIG[priority];

  const isOverdue = !reminder.completed && !reminder.snoozed && isTimePassed(reminder.time);

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCompleting(true);
    onComplete?.(reminder.id);
    
    setTimeout(() => {
      setIsCompleting(false);
    }, 500);
  };

  const handleSnooze = (duration: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSnooze?.(reminder.id, duration);
    setShowSnoozeOptions(false);
    setIsExpanded(false);
  };

  // Compact variant
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "group flex items-center gap-3 p-2 rounded-lg border bg-card",
          "hover:shadow-sm transition-all cursor-pointer",
          reminder.completed && "opacity-60",
          reminder.snoozed && "bg-amber-50/50 border-amber-200/50",
          isOverdue && "border-red-200 bg-red-50/30",
          className
        )}
        onClick={() => onClick?.(reminder)}
      >
        {/* Status icon */}
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          reminder.completed && "bg-green-100 text-green-600",
          reminder.snoozed && "bg-amber-100 text-amber-600",
          isOverdue && "bg-red-100 text-red-600",
          !reminder.completed && !reminder.snoozed && !isOverdue && "bg-blue-100 text-blue-600"
        )}>
          {reminder.completed ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : reminder.snoozed ? (
            <Snooze className="w-4 h-4" />
          ) : isOverdue ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            reminder.completed && "line-through text-muted-foreground"
          )}>
            {reminder.title}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{reminder.time}</span>
            {repeat !== "none" && (
              <>
                <span>•</span>
                <RepeatIcon className={cn("w-3 h-3", repeatConfig.color)} />
                <span>{repeatConfig.label}</span>
              </>
            )}
          </div>
        </div>

        {/* Complete button */}
        {!reminder.completed && (
          <button
            onClick={handleComplete}
            className={cn(
              "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
              "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5 opacity-0 hover:opacity-100" />
          </button>
        )}
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
          reminder.snoozed && "border-amber-200 bg-amber-50/10",
          isOverdue && "border-red-200 bg-red-50/10",
          className
        )}
      >
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Status icon */}
            <div className={cn(
              "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
              reminder.completed && "bg-green-100 text-green-600",
              reminder.snoozed && "bg-amber-100 text-amber-600",
              isOverdue && "bg-red-100 text-red-600",
              !reminder.completed && !reminder.snoozed && !isOverdue && "bg-blue-100 text-blue-600"
            )}>
              {reminder.completed ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : reminder.snoozed ? (
                <Snooze className="w-6 h-6" />
              ) : isOverdue ? (
                <AlertCircle className="w-6 h-6" />
              ) : (
                <Bell className="w-6 h-6" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className={cn(
                    "font-semibold text-lg",
                    reminder.completed && "line-through text-muted-foreground"
                  )}>
                    {reminder.title}
                  </h3>
                  
                  {/* Time and repeat */}
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {reminder.time}
                    </span>
                    {repeat !== "none" && (
                      <span className={cn("flex items-center gap-1.5", repeatConfig.color)}>
                        <RepeatIcon className="w-4 h-4" />
                        {repeatConfig.label}
                        {reminder.customRepeat && ` (${reminder.customRepeat})`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Priority badge */}
                <Badge variant="outline" className={cn("text-xs", priorityConfig.color)}>
                  {priorityConfig.label}
                </Badge>
              </div>

              {/* Snooze info */}
              {reminder.snoozed && reminder.snoozeUntil && (
                <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  <Snooze className="w-4 h-4" />
                  <span>Snoozed until {reminder.snoozeUntil}</span>
                </div>
              )}

              {/* Overdue warning */}
              {isOverdue && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span>This reminder is overdue</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(reminder);
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
                    onDelete(reminder.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions footer */}
        {!reminder.completed && (
          <div className="px-4 py-3 bg-muted/30 border-t flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Quick actions:</span>
            
            {onSnooze && (
              <>
                {SNOOZE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => handleSnooze(option.value, e)}
                  >
                    <Snooze className="w-3 h-3 mr-1" />
                    {option.label}
                  </Button>
                ))}
              </>
            )}
            
            {onDismiss && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(reminder.id);
                }}
              >
                <X className="w-3 h-3 mr-1" />
                Dismiss
              </Button>
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
        reminder.snoozed && "border-amber-200 bg-amber-50/30",
        isOverdue && "border-red-200 bg-red-50/20",
        isCompleting && "opacity-50 scale-95",
        className
      )}
      onClick={() => onClick?.(reminder)}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
          reminder.completed && "bg-green-100 text-green-600",
          reminder.snoozed && "bg-amber-100 text-amber-600",
          isOverdue && "bg-red-100 text-red-600",
          !reminder.completed && !reminder.snoozed && !isOverdue && "bg-blue-100 text-blue-600"
        )}>
          {reminder.completed ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : reminder.snoozed ? (
            <Snooze className="w-4 h-4" />
          ) : isOverdue ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium leading-tight",
            reminder.completed && "line-through text-muted-foreground"
          )}>
            {reminder.title}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {reminder.time}
            </span>
            {repeat !== "none" && (
              <span className={cn("flex items-center gap-1", repeatConfig.color)}>
                <RepeatIcon className="w-3 h-3" />
                {repeatConfig.label}
              </span>
            )}
            {priority !== "normal" && (
              <Badge variant="outline" className={cn("text-[10px] h-5", priorityConfig.color)}>
                {priorityConfig.label}
              </Badge>
            )}
          </div>

          {/* Snooze info */}
          {reminder.snoozed && reminder.snoozeUntil && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
              <Snooze className="w-3 h-3" />
              Snoozed until {reminder.snoozeUntil}
            </div>
          )}

          {/* Overdue warning */}
          {isOverdue && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
              <AlertCircle className="w-3 h-3" />
              Overdue
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!reminder.completed && onSnooze && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                setShowSnoozeOptions(!showSnoozeOptions);
              }}
            >
              <Snooze className="w-4 h-4" />
            </Button>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(reminder);
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

      {/* Snooze options */}
      {showSnoozeOptions && onSnooze && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Snooze for:</p>
          <div className="flex flex-wrap gap-2">
            {SNOOZE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={(e) => handleSnooze(option.value, e)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Expanded actions */}
      {isExpanded && !showSnoozeOptions && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {!reminder.completed && onComplete && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={handleComplete}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complete
              </Button>
            )}
            {onSnooze && !reminder.snoozed && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSnoozeOptions(true);
                }}
              >
                <Snooze className="w-3 h-3 mr-1" />
                Snooze
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(reminder.id);
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

// Helper function to check if time has passed
function isTimePassed(timeStr: string): boolean {
  // Simple check - in real implementation, parse the time properly
  const now = new Date();
  const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
  const match = timeStr.match(timeRegex);
  
  if (!match) return false;
  
  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3]?.toUpperCase();
  
  let taskHours = hours;
  if (ampm === "PM" && hours !== 12) taskHours += 12;
  if (ampm === "AM" && hours === 12) taskHours = 0;
  
  const taskTime = new Date();
  taskTime.setHours(taskHours, minutes, 0, 0);
  
  return now > taskTime;
}
