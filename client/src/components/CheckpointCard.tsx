import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface CheckpointCardProps {
  summary: string;
  onContinue: () => void;
}

export function CheckpointCard({ summary, onContinue }: CheckpointCardProps) {
  return (
    <div className="rounded-2xl border bg-accent/50 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <Badge variant="default" className="mb-2">
          Checkpoint
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={onContinue}
          className="h-7 text-xs"
        >
          Continue from here
        </Button>
      </div>
      
      <p className="text-sm text-accent-foreground leading-relaxed">
        {summary}
      </p>
    </div>
  );
}