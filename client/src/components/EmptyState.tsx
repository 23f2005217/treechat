import { MessageSquare } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Start a conversation
      </h3>
      <p className="text-muted-foreground max-w-md">
        This thread is empty. Send a message to begin discussing your tasks, 
        projects, or any other topics you'd like to organize.
      </p>
    </div>
  );
}