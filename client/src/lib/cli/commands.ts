/**
 * CLI Commands Module
 * 
 * Defines the command structure and available commands for the mini-CLI interface.
 * Supports @mentions for tasks, reminders, and events with CRUD operations.
 */

import { 
  ClipboardList, 
  Bell, 
  Calendar, 
  Plus, 
  Edit3, 
  Trash2, 
  Search,
  CheckCircle2,
  List,
  Clock,
  type LucideIcon
} from "lucide-react";

export type CommandType = "task" | "reminder" | "event";
export type CommandAction = "create" | "edit" | "delete" | "list" | "complete" | "suggest";

export interface CommandOption {
  name: string;
  alias?: string;
  description: string;
  required?: boolean;
  placeholder?: string;
}

export interface CLICommand {
  id: string;
  type: CommandType;
  action: CommandAction;
  label: string;
  icon: LucideIcon;
  description: string;
  shortcut?: string;
  options: CommandOption[];
  examples: string[];
}

// Task commands
export const taskCommands: CLICommand[] = [
  {
    id: "task-create",
    type: "task",
    action: "create",
    label: "add",
    icon: Plus,
    description: "Create a new task",
    shortcut: "@task add",
    options: [
      { name: "title", description: "Task title", required: true, placeholder: "Buy groceries" },
      { name: "time", alias: "t", description: "Due time (e.g., '2pm', 'tomorrow 9am')", placeholder: "3pm" },
      { name: "duration", alias: "d", description: "Estimated duration in minutes", placeholder: "30" },
      { name: "priority", alias: "p", description: "Priority (high, medium, low)", placeholder: "medium" },
    ],
    examples: [
      "@task add Buy groceries --time 5pm --duration 30",
      "@task add Call mom -t tomorrow 2pm -p high",
    ],
  },
  {
    id: "task-edit",
    type: "task",
    action: "edit",
    label: "edit",
    icon: Edit3,
    description: "Edit an existing task",
    shortcut: "@task edit",
    options: [
      { name: "id", description: "Task ID or keyword", required: true, placeholder: "task-123 or 'groceries'" },
      { name: "title", description: "New title", placeholder: "Updated title" },
      { name: "time", alias: "t", description: "New due time", placeholder: "4pm" },
    ],
    examples: [
      "@task edit groceries --title Buy organic groceries",
      "@task edit task-123 -t next week",
    ],
  },
  {
    id: "task-delete",
    type: "task",
    action: "delete",
    label: "delete",
    icon: Trash2,
    description: "Delete a task",
    shortcut: "@task delete",
    options: [
      { name: "id", description: "Task ID or keyword", required: true, placeholder: "task-123 or 'groceries'" },
    ],
    examples: [
      "@task delete groceries",
      "@task delete task-123",
    ],
  },
  {
    id: "task-list",
    type: "task",
    action: "list",
    label: "list",
    icon: List,
    description: "List all tasks",
    shortcut: "@task list",
    options: [
      { name: "filter", alias: "f", description: "Filter by status (all, pending, completed)", placeholder: "pending" },
      { name: "sort", alias: "s", description: "Sort by (time, priority, created)", placeholder: "time" },
    ],
    examples: [
      "@task list",
      "@task list --filter pending --sort priority",
    ],
  },
  {
    id: "task-complete",
    type: "task",
    action: "complete",
    label: "done",
    icon: CheckCircle2,
    description: "Mark a task as complete",
    shortcut: "@task done",
    options: [
      { name: "id", description: "Task ID or keyword", required: true, placeholder: "task-123 or 'groceries'" },
    ],
    examples: [
      "@task done groceries",
      "@task done task-123",
    ],
  },
  {
    id: "task-suggest",
    type: "task",
    action: "suggest",
    label: "suggest",
    icon: Search,
    description: "Get task suggestions based on context",
    shortcut: "@task suggest",
    options: [
      { name: "context", alias: "c", description: "Context for suggestions", placeholder: "work, personal, urgent" },
    ],
    examples: [
      "@task suggest",
      "@task suggest --context urgent",
    ],
  },
];

// Reminder commands
export const reminderCommands: CLICommand[] = [
  {
    id: "reminder-create",
    type: "reminder",
    action: "create",
    label: "add",
    icon: Plus,
    description: "Create a new reminder",
    shortcut: "@reminder add",
    options: [
      { name: "title", description: "Reminder text", required: true, placeholder: "Take medicine" },
      { name: "time", alias: "t", description: "Reminder time", required: true, placeholder: "8pm" },
      { name: "repeat", alias: "r", description: "Repeat pattern (daily, weekly, none)", placeholder: "daily" },
    ],
    examples: [
      "@reminder add Take medicine --time 8pm --repeat daily",
      "@reminder add Call dentist -t tomorrow 10am",
    ],
  },
  {
    id: "reminder-edit",
    type: "reminder",
    action: "edit",
    label: "edit",
    icon: Edit3,
    description: "Edit an existing reminder",
    shortcut: "@reminder edit",
    options: [
      { name: "id", description: "Reminder ID or keyword", required: true, placeholder: "rem-123 or 'medicine'" },
      { name: "title", description: "New text", placeholder: "Updated reminder" },
      { name: "time", alias: "t", description: "New time", placeholder: "9pm" },
    ],
    examples: [
      "@reminder edit medicine --time 9pm",
      "@reminder edit rem-123 --title Take vitamins",
    ],
  },
  {
    id: "reminder-delete",
    type: "reminder",
    action: "delete",
    label: "delete",
    icon: Trash2,
    description: "Delete a reminder",
    shortcut: "@reminder delete",
    options: [
      { name: "id", description: "Reminder ID or keyword", required: true, placeholder: "rem-123 or 'medicine'" },
    ],
    examples: [
      "@reminder delete medicine",
      "@reminder delete rem-123",
    ],
  },
  {
    id: "reminder-list",
    type: "reminder",
    action: "list",
    label: "list",
    icon: List,
    description: "List all reminders",
    shortcut: "@reminder list",
    options: [
      { name: "filter", alias: "f", description: "Filter (upcoming, all, expired)", placeholder: "upcoming" },
    ],
    examples: [
      "@reminder list",
      "@reminder list --filter upcoming",
    ],
  },
  {
    id: "reminder-snooze",
    type: "reminder",
    action: "suggest",
    label: "snooze",
    icon: Clock,
    description: "Snooze a reminder",
    shortcut: "@reminder snooze",
    options: [
      { name: "id", description: "Reminder ID or keyword", required: true, placeholder: "rem-123" },
      { name: "duration", alias: "d", description: "Snooze duration", placeholder: "10min, 1hour" },
    ],
    examples: [
      "@reminder snooze medicine --duration 30min",
      "@reminder snooze rem-123 -d 1hour",
    ],
  },
];

// Event commands
export const eventCommands: CLICommand[] = [
  {
    id: "event-create",
    type: "event",
    action: "create",
    label: "add",
    icon: Plus,
    description: "Create a new event",
    shortcut: "@event add",
    options: [
      { name: "title", description: "Event title", required: true, placeholder: "Team meeting" },
      { name: "time", alias: "t", description: "Event time", required: true, placeholder: "tomorrow 2pm" },
      { name: "duration", alias: "d", description: "Duration in minutes", placeholder: "60" },
    ],
    examples: [
      "@event add Team meeting --time tomorrow 2pm --duration 60",
      "@event add Lunch with Sarah -t friday 12pm -d 90",
    ],
  },
  {
    id: "event-edit",
    type: "event",
    action: "edit",
    label: "edit",
    icon: Edit3,
    description: "Edit an existing event",
    shortcut: "@event edit",
    options: [
      { name: "id", description: "Event ID or keyword", required: true, placeholder: "evt-123 or 'meeting'" },
      { name: "time", alias: "t", description: "New time", placeholder: "3pm" },
    ],
    examples: [
      "@event edit meeting --time 3pm",
      "@event edit evt-123 -t next monday",
    ],
  },
  {
    id: "event-delete",
    type: "event",
    action: "delete",
    label: "delete",
    icon: Trash2,
    description: "Delete an event",
    shortcut: "@event delete",
    options: [
      { name: "id", description: "Event ID or keyword", required: true, placeholder: "evt-123" },
    ],
    examples: [
      "@event delete meeting",
      "@event delete evt-123",
    ],
  },
  {
    id: "event-list",
    type: "event",
    action: "list",
    label: "list",
    icon: List,
    description: "List upcoming events",
    shortcut: "@event list",
    options: [
      { name: "range", alias: "r", description: "Time range (today, week, month)", placeholder: "week" },
    ],
    examples: [
      "@event list",
      "@event list --range today",
    ],
  },
];

// All commands combined
export const allCommands: CLICommand[] = [
  ...taskCommands,
  ...reminderCommands,
  ...eventCommands,
];

// Type groups for UI
export const commandGroups = [
  { type: "task" as CommandType, label: "Tasks", icon: ClipboardList, commands: taskCommands },
  { type: "reminder" as CommandType, label: "Reminders", icon: Bell, commands: reminderCommands },
  { type: "event" as CommandType, label: "Events", icon: Calendar, commands: eventCommands },
];

// Helper to find command by ID
export function findCommand(id: string): CLICommand | undefined {
  return allCommands.find(cmd => cmd.id === id);
}

// Helper to get commands by type
export function getCommandsByType(type: CommandType): CLICommand[] {
  return allCommands.filter(cmd => cmd.type === type);
}

// Helper to get main mention types (for initial @ suggestions)
export const mainMentionTypes = [
  { id: "task", label: "task", icon: ClipboardList, description: "Create or manage tasks" },
  { id: "reminder", label: "reminder", icon: Bell, description: "Set or manage reminders" },
  { id: "event", label: "event", icon: Calendar, description: "Schedule events" },
];
