/**
 * TaskList Component
 * 
 * A modular task list component that displays tasks using TaskCard.
 * Supports different layouts and filtering.
 */

import { useState, useMemo } from "react";
import { 
  Filter, 
  SortAsc, 
  Grid3X3, 
  List as ListIcon,
  CheckCircle2,
  Circle,
  Clock,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { TaskCard, type Task } from "./TaskCard";
import { cn } from "../lib/utils";

type ViewMode = "list" | "grid" | "compact";
type SortBy = "time" | "priority" | "energy" | "created";
type FilterBy = "all" | "pending" | "completed" | "high-priority";

interface TaskListProps {
  tasks: Task[];
  title?: string;
  showControls?: boolean;
  defaultView?: ViewMode;
  onCompleteTask?: (taskId: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onRescheduleTask?: (taskId: string, when: string) => void;
  onPinTask?: (taskId: string) => void;
  onTaskClick?: (task: Task) => void;
  className?: string;
}

export function TaskList({
  tasks,
  title = "Tasks",
  showControls = true,
  defaultView = "list",
  onCompleteTask,
  onEditTask,
  onDeleteTask,
  onRescheduleTask,
  onPinTask,
  onTaskClick,
  className,
}: TaskListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [sortBy, setSortBy] = useState<SortBy>("time");
  const [filterBy, setFilterBy] = useState<FilterBy>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    switch (filterBy) {
      case "pending":
        result = result.filter(t => !t.completed);
        break;
      case "completed":
        result = result.filter(t => t.completed);
        break;
      case "high-priority":
        result = result.filter(t => t.priority === "high" && !t.completed);
        break;
      case "all":
      default:
        break;
    }

    return result;
  }, [tasks, filterBy]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const result = [...filteredTasks];

    switch (sortBy) {
      case "priority":
        result.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority || "medium"] - priorityOrder[b.priority || "medium"];
        });
        break;
      case "energy":
        result.sort((a, b) => {
          const energyOrder = { high: 0, medium: 1, low: 2 };
          return energyOrder[a.energy || "medium"] - energyOrder[b.energy || "medium"];
        });
        break;
      case "created":
        result.sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime;
        });
        break;
      case "time":
      default:
        // Keep original order (assumed to be by time)
        break;
    }

    return result;
  }, [filteredTasks, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const highPriority = tasks.filter(t => t.priority === "high" && !t.completed).length;

    return { total, completed, pending, highPriority };
  }, [tasks]);

  const getCardVariant = (): "default" | "compact" | "detailed" => {
    switch (viewMode) {
      case "compact":
        return "compact";
      case "grid":
        return "detailed";
      case "list":
      default:
        return "default";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            {stats.pending} pending
          </Badge>
          {stats.highPriority > 0 && (
            <Badge variant="destructive" className="text-xs">
              {stats.highPriority} high priority
            </Badge>
          )}
        </div>

        {showControls && (
          <div className="flex items-center gap-1">
            {/* Filter button */}
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 gap-1.5", showFilters && "bg-accent")}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
            </Button>

            {/* View mode toggle */}
            <div className="flex items-center border rounded-lg p-0.5">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode("list")}
              >
                <ListIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "compact" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode("compact")}
              >
                <CheckCircle2 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-xs text-muted-foreground">Filter:</span>
          {(["all", "pending", "completed", "high-priority"] as FilterBy[]).map((filter) => (
            <Button
              key={filter}
              variant={filterBy === filter ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => setFilterBy(filter)}
            >
              {filter.replace("-", " ")}
            </Button>
          ))}

          <div className="w-px h-4 bg-border mx-2" />

          <span className="text-xs text-muted-foreground">Sort:</span>
          {(["time", "priority", "energy", "created"] as SortBy[]).map((sort) => (
            <Button
              key={sort}
              variant={sortBy === sort ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => setSortBy(sort)}
            >
              <SortAsc className="w-3 h-3 mr-1" />
              {sort}
            </Button>
          ))}
        </div>
      )}

      {/* Task list */}
      {sortedTasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Circle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tasks found</p>
          <p className="text-xs mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className={cn(
          "space-y-2",
          viewMode === "grid" && "grid grid-cols-1 md:grid-cols-2 gap-3 space-y-0"
        )}>
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              variant={getCardVariant()}
              onComplete={onCompleteTask}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onReschedule={onRescheduleTask}
              onPin={onPinTask}
              onClick={onTaskClick}
            />
          ))}
        </div>
      )}

      {/* Footer stats */}
      {stats.completed > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>
            {stats.completed} of {stats.total} completed
          </span>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{Math.round((stats.completed / stats.total) * 100)}% done</span>
          </div>
        </div>
      )}
    </div>
  );
}
