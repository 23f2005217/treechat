/**
 * useTaskOperations - Hook for task-related operations with undo support
 * 
 * Provides:
 * - Task completion with undo
 * - Task rescheduling with undo
 * - Undo toast management
 * - Bulk operations
 */

import { useState, useCallback } from "react";
import axios from "axios";

interface UndoToast {
  id: string;
  message: string;
  undoToken: string;
  expiresInSeconds: number;
}

interface UseTaskOperationsReturn {
  // Operations
  completeTask: (taskId: string, taskTitle: string) => Promise<void>;
  rescheduleTask: (taskId: string, intent: string) => Promise<void>;
  bulkReschedule: (intent: string) => Promise<void>;
  undoAction: (token: string) => Promise<boolean>;
  
  // State
  undoToasts: UndoToast[];
  dismissUndoToast: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useTaskOperations(): UseTaskOperationsReturn {
  const [undoToasts, setUndoToasts] = useState<UndoToast[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addUndoToast = useCallback((message: string, undoToken: string) => {
    const id = `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const toast: UndoToast = {
      id,
      message,
      undoToken,
      expiresInSeconds: 30,
    };
    setUndoToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const dismissUndoToast = useCallback((id: string) => {
    setUndoToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const completeTask = useCallback(async (taskId: string, taskTitle: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Complete the task
      await axios.patch(`/api/tasks/${taskId}`, { completed: true });
      
      // Add undo toast (in a real implementation, the server would return an undo token)
      addUndoToast(`Completed "${taskTitle}"`, `complete_${taskId}`);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.detail || err.message
        : "Failed to complete task";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [addUndoToast]);

  const rescheduleTask = useCallback(async (taskId: string, intent: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post("/api/summary/reschedule", {
        task_id: taskId,
        intent,
      });

      const { message, undo_token } = response.data;
      
      if (undo_token) {
        addUndoToast(message, undo_token);
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.detail || err.message
        : "Failed to reschedule task";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [addUndoToast]);

  const bulkReschedule = useCallback(async (intent: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post("/api/summary/reschedule/bulk", {
        intent,
      });

      const { message, undo_token } = response.data;
      
      if (undo_token) {
        addUndoToast(message, undo_token);
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.detail || err.message
        : "Failed to reschedule tasks";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [addUndoToast]);

  const undoAction = useCallback(async (token: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post("/api/summary/undo", {
        action_id: token,
      });

      return response.data.success;
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.detail || err.message
        : "Failed to undo action";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    completeTask,
    rescheduleTask,
    bulkReschedule,
    undoAction,
    undoToasts,
    dismissUndoToast,
    isLoading,
    error,
    clearError,
  };
}
