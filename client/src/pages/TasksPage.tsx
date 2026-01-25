import React, { useState, useEffect } from "react";
import axios from "axios";
import { CheckCircle2, Circle, Clock, Tag, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  domain: string;
  urgency: string;
  due_fuzzy?: string;
  completed: boolean;
}

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get("/api/tasks/");
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const toggleTask = async (id: string, completed: boolean) => {
    try {
      await axios.patch(`/api/tasks/${id}`, { completed: !completed });
      fetchTasks();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const urgencyColor = (level: string) => {
    switch (level) {
      case "critical": return "text-destructive border-destructive bg-destructive/10";
      case "high": return "text-orange-500 border-orange-500 bg-orange-500/10";
      case "medium": return "text-blue-500 border-blue-500 bg-blue-500/10";
      default: return "text-muted-foreground border-muted-foreground bg-muted/10";
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Your Tasks</h1>
        <Badge variant="outline">{tasks.filter(t => !t.completed).length} pending</Badge>
      </div>

      <div className="grid gap-4">
        {tasks.map((task) => (
          <div key={task.id} className={cn(
            "flex items-center gap-4 p-4 rounded-xl border bg-card transition-all hover:shadow-md",
            task.completed && "opacity-60"
          )}>
            <button onClick={() => toggleTask(task.id, task.completed)}>
              {task.completed ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6 text-muted-foreground" />}
            </button>
            <div className="flex-1">
              <h3 className={cn("font-medium", task.completed && "line-through")}>{task.title}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Tag className="w-3 h-3" /> {task.domain}
                </span>
                {task.due_fuzzy && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> {task.due_fuzzy}
                  </span>
                )}
              </div>
            </div>
            <Badge className={cn("capitalize", urgencyColor(task.urgency))}>
              {task.urgency}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TasksPage;
