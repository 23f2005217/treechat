import { useState, useCallback } from "react";

interface UseForkDialogReturn {
  isOpen: boolean;
  forkFromMessageId: string | null;
  openDialog: (messageId?: string) => void;
  closeDialog: () => void;
}

export function useForkDialog(): UseForkDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [forkFromMessageId, setForkFromMessageId] = useState<string | null>(null);

  const openDialog = useCallback((messageId?: string) => {
    setForkFromMessageId(messageId || null);
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setForkFromMessageId(null);
  }, []);

  return {
    isOpen,
    forkFromMessageId,
    openDialog,
    closeDialog,
  };
}