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
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors cursor-default">
          <GitFork className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Forked
            </span>
            <Badge variant="outline" className="border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 text-xs">
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