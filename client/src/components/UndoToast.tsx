/**
 * UndoToast - Shows undoable actions with countdown timer
 * 
 * Implements the undo-first safety model UI:
 * - Shows soft confirmation messages
 * - Countdown timer (30 seconds)
 * - One-click undo
 * - Auto-dismiss on expiration
 */

import { useState, useEffect, useCallback } from "react";
import { Undo, X, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface UndoToastProps {
  message: string;
  undoToken: string;
  expiresInSeconds?: number;
  onUndo: (token: string) => Promise<boolean>;
  onDismiss?: () => void;
  className?: string;
}

export function UndoToast({
  message,
  undoToken,
  expiresInSeconds = 30,
  onUndo,
  onDismiss,
  className,
}: UndoToastProps) {
  const [timeLeft, setTimeLeft] = useState(expiresInSeconds);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || isDismissed || isUndoing) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismiss?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isDismissed, isUndoing, onDismiss]);

  const handleUndo = useCallback(async () => {
    if (isUndoing) return;
    
    setIsUndoing(true);
    try {
      const success = await onUndo(undoToken);
      if (success) {
        setShowSuccess(true);
        setTimeout(() => {
          setIsDismissed(true);
          onDismiss?.();
        }, 1500);
      } else {
        setIsUndoing(false);
      }
    } catch (error) {
      console.error("Undo failed:", error);
      setIsUndoing(false);
    }
  }, [undoToken, onUndo, onDismiss, isUndoing]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  if (isDismissed) return null;

  // Success state
  if (showSuccess) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg",
          "bg-primary/10 border border-primary/20",
          "animate-in slide-in-from-bottom-2",
          className
        )}
      >
        <Undo className="w-4 h-4 text-primary" />
        <span className="text-sm text-primary-foreground">
          Action undone successfully
        </span>
      </div>
    );
  }

  const progressPercent = (timeLeft / expiresInSeconds) * 100;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card shadow-lg",
        "animate-in slide-in-from-bottom-2 fade-in duration-300",
        className
      )}
    >
      {/* Progress bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-0.5 transition-all duration-1000 ease-linear",
          timeLeft <= 5 ? "bg-red-500" : "bg-primary"
        )}
        style={{ width: `${progressPercent}%` }}
      />

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="relative">
            <Undo className="w-5 h-5 text-primary" />
            {/* Pulsing ring when time is running out */}
            {timeLeft <= 5 && (
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            )}
          </div>
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{message}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <Clock className="w-3 h-3" />
            <span>
              {timeLeft <= 5 ? (
                <span className="text-red-500 font-medium">Expiring...</span>
              ) : (
                `Undo available for ${timeLeft}s`
              )}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={handleUndo}
            disabled={isUndoing}
          >
            {isUndoing ? (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Undoing...
              </span>
            ) : (
              <>
                <Undo className="w-3 h-3 mr-1" />
                Undo
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Container for multiple undo toasts
interface UndoToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    undoToken: string;
    expiresInSeconds: number;
  }>;
  onUndo: (token: string) => Promise<boolean>;
  onDismiss: (id: string) => void;
}

export function UndoToastContainer({ toasts, onUndo, onDismiss }: UndoToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <UndoToast
          key={toast.id}
          message={toast.message}
          undoToken={toast.undoToken}
          expiresInSeconds={toast.expiresInSeconds}
          onUndo={onUndo}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}
