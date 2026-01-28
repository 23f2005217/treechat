import { MessageSquare, Sparkles, GitFork, Pin, CheckSquare, Calendar, Zap } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({ 
  title = "Your task assistant",
  description = "Ask about your tasks, create new ones, or get organized. Try: \"What do I have today?\" or \"Give me easy tasks\""
}: EmptyStateProps) {
  const quickActions = [
    { label: "What do I have today?", icon: CheckSquare },
    { label: "What's left this week?", icon: Calendar },
    { label: "Give me easy tasks", icon: Zap },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 sm:p-8">
      {/* Animated icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse" />
        <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-full p-4">
          <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
        </div>
      </div>
      
      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground max-w-md text-sm sm:text-base mb-6">
        {description}
      </p>

      {/* Quick action suggestions */}
      <div className="w-full max-w-sm space-y-2 mb-6">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm 
                         bg-muted/50 hover:bg-muted rounded-lg transition-colors
                         border border-transparent hover:border-border"
              onClick={() => {
                // Dispatch a custom event that ThreadPage can listen for
                window.dispatchEvent(new CustomEvent('emptyStateAction', { detail: action.label }));
              }}
            >
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-foreground">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Feature hints */}
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>AI-powered</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full">
          <GitFork className="h-3.5 w-3.5 text-accent" />
          <span>Fork threads</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full">
          <Pin className="h-3.5 w-3.5 text-secondary-foreground" />
          <span>Pin context</span>
        </div>
      </div>
    </div>
  );
}
