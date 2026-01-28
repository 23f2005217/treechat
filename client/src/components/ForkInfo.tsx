import { GitFork } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ForkInfoProps {
  forkType?: string | null;
  parentTitle?: string | null;
  forkedFromMessageId?: string | null;
}

export function ForkInfo({ forkType, parentTitle, forkedFromMessageId }: ForkInfoProps) {
  if (!forkType || !parentTitle) {
    return null;
  }

  const forkTypeLabel = forkType === "summary" ? "Summary" : forkType === "full" ? "Full Context" : "Empty";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/30 border border-accent/40 hover:bg-accent/40 transition-colors cursor-default">
          <GitFork className="h-4 w-4 text-accent-foreground" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-accent-foreground">
              Forked
            </span>
            <Badge variant="outline" className="border-accent/50 text-accent-foreground text-xs">
              {forkTypeLabel}
            </Badge>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm">
        <div className="space-y-1">
          <div className="font-medium text-foreground">Forked from thread</div>
          <div className="text-sm text-muted-foreground">{parentTitle}</div>
          {forkedFromMessageId && (
            <div className="text-xs text-muted-foreground mt-1">
              Starting from a specific message
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}