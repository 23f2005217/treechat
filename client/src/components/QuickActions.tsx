/**
 * QuickActions - Quick action buttons for common task operations
 * 
 * Provides one-tap access to:
 * - "What do I have today?"
 * - "What's left this week?"
 * - "Give me easy tasks"
 * - "Push everything to tomorrow"
 */

import { useState } from "react";
import { 
  Sun, 
  Calendar, 
  Zap, 
  ArrowRight, 
  Clock,
  AlertCircle,
  ChevronDown
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "../lib/utils";

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: typeof Sun;
  query: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "today",
    label: "Today",
    description: "What do I have today?",
    icon: Sun,
    query: "What do I have today?",
    variant: "default",
  },
  {
    id: "week",
    label: "This Week",
    description: "What's left this week?",
    icon: Calendar,
    query: "What's left this week?",
    variant: "secondary",
  },
  {
    id: "easy",
    label: "Easy Tasks",
    description: "Give me easy tasks",
    icon: Zap,
    query: "Give me easy tasks",
    variant: "outline",
  },
];

const TIME_BASED_ACTIONS: QuickAction[] = [
  {
    id: "5min",
    label: "5 min",
    description: "What can I do in 5 minutes?",
    icon: Clock,
    query: "What can I do in 5 minutes?",
  },
  {
    id: "10min",
    label: "10 min",
    description: "What can I do in 10 minutes?",
    icon: Clock,
    query: "What can I do in 10 minutes?",
  },
  {
    id: "30min",
    label: "30 min",
    description: "What can I do in 30 minutes?",
    icon: Clock,
    query: "What can I do in 30 minutes?",
  },
];

const RESCHEDULE_ACTIONS: QuickAction[] = [
  {
    id: "tomorrow",
    label: "Push to tomorrow",
    description: "Push everything to tomorrow",
    icon: ArrowRight,
    query: "Push everything to tomorrow",
  },
  {
    id: "not_today",
    label: "Not today",
    description: "Not today",
    icon: ArrowRight,
    query: "Not today",
  },
];

interface QuickActionsProps {
  onAction: (query: string) => void;
  className?: string;
  disabled?: boolean;
}

export function QuickActions({ onAction, className, disabled }: QuickActionsProps) {
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
  const [isRescheduleMenuOpen, setIsRescheduleMenuOpen] = useState(false);

  const handleAction = (action: QuickAction) => {
    onAction(action.query);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Main quick actions */}
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id}
            variant={action.variant || "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => handleAction(action)}
            disabled={disabled}
            title={action.description}
          >
            <Icon className="w-3.5 h-3.5" />
            {action.label}
          </Button>
        );
      })}

      {/* Time-based dropdown */}
      <DropdownMenu open={isTimeMenuOpen} onOpenChange={setIsTimeMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={disabled}
          >
            <Clock className="w-3.5 h-3.5" />
            Time
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {TIME_BASED_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <DropdownMenuItem
                key={action.id}
                onClick={() => {
                  handleAction(action);
                  setIsTimeMenuOpen(false);
                }}
              >
                <Icon className="w-4 h-4 mr-2" />
                <div>
                  <p className="text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reschedule dropdown */}
      <DropdownMenu open={isRescheduleMenuOpen} onOpenChange={setIsRescheduleMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={disabled}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Reschedule
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {RESCHEDULE_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <DropdownMenuItem
                key={action.id}
                onClick={() => {
                  handleAction(action);
                  setIsRescheduleMenuOpen(false);
                }}
              >
                <Icon className="w-4 h-4 mr-2" />
                <div>
                  <p className="text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Overdue button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
        onClick={() => onAction("What tasks are overdue?")}
        disabled={disabled}
      >
        <AlertCircle className="w-3.5 h-3.5" />
        Overdue
      </Button>
    </div>
  );
}

// Inline suggestion chips that appear while typing
interface SuggestionChipProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  className?: string;
}

export function SuggestionChips({ suggestions, onSelect, className }: SuggestionChipProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          className={cn(
            "px-3 py-1.5 text-xs rounded-full",
            "bg-secondary text-secondary-foreground",
            "hover:bg-secondary/80 transition-colors",
            "border border-transparent hover:border-border"
          )}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

// Smart suggestions based on context
export function getSmartSuggestions(input: string): string[] {
  const lower = input.toLowerCase();
  const suggestions: string[] = [];

  if (lower.includes("task") || lower.includes("todo")) {
    suggestions.push("What do I have today?");
  }

  if (lower.includes("later") || lower.includes("tomorrow")) {
    suggestions.push("Push everything to tomorrow");
  }

  if (lower.includes("easy") || lower.includes("quick")) {
    suggestions.push("Give me easy tasks");
  }

  if (lower.includes("time") || lower.includes("minutes")) {
    suggestions.push("What can I do in 10 minutes?");
  }

  if (suggestions.length === 0 && lower.length > 0) {
    suggestions.push(
      "What do I have today?",
      "What's left this week?",
      "Give me easy tasks"
    );
  }

  return suggestions.slice(0, 3);
}
