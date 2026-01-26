import { useEffect, useCallback } from "react";
import axios from "axios";
import { useSidebarStore, type SidebarTreeItem } from "../store/useSidebarStore";
import { MessageSquare, Folder, GitFork } from "lucide-react";

interface BackendContext {
  _id: string;
  title: string;
  created_at: string;
  updated_at: string;
  parent_context_id?: string | null;
  fork_type?: string | null;
}

export type ForkType = "summary" | "full" | "empty";

export function useThreads() {
  const setTreeData = useSidebarStore((state) => state.setTreeData);

  const fetchThreads = useCallback(async () => {
    try {
      const response = await axios.get<BackendContext[]>("/api/contexts/");
      const contexts = response.data;
      
      // Separate root threads from forked threads
      const rootThreads = contexts.filter(ctx => !ctx.parent_context_id);
      const forkedThreads = contexts.filter(ctx => ctx.parent_context_id);
      
      // Build nested structure
      const buildThreadItem = (ctx: BackendContext): SidebarTreeItem => {
        const children = forkedThreads
          .filter(child => child.parent_context_id === ctx._id)
          .map(child => buildThreadItem(child));
        
        return {
          id: ctx._id,
          name: ctx.title || "Untitled Thread",
          icon: ctx.parent_context_id ? GitFork : MessageSquare,
          type: "thread" as const,
          createdAt: new Date(ctx.created_at).getTime(),
          updatedAt: new Date(ctx.updated_at).getTime(),
          children: children.length > 0 ? children : undefined,
        };
      };
      
      const threads = rootThreads.map(ctx => buildThreadItem(ctx));

      setTreeData([
        {
          id: "all",
          name: "All Threads",
          icon: Folder,
          type: "folder" as const,
          children: threads,
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    }
  }, [setTreeData]);

  const createThread = useCallback(async (title: string): Promise<string | null> => {
    try {
      const response = await axios.post("/api/contexts/", { title });
      await fetchThreads();
      return response.data._id || response.data.id;
    } catch (error) {
      console.error("Failed to create thread:", error);
      return null;
    }
  }, [fetchThreads]);

  const renameThread = useCallback(async (threadId: string, newTitle: string) => {
    try {
      await axios.patch(`/api/contexts/${threadId}`, null, {
        params: { title: newTitle }
      });
      await fetchThreads();
    } catch (error) {
      console.error("Failed to rename thread:", error);
    }
  }, [fetchThreads]);

  const deleteThread = useCallback(async (threadId: string) => {
    try {
      await axios.delete(`/api/contexts/${threadId}`);
      await fetchThreads();
    } catch (error) {
      console.error("Failed to delete thread:", error);
    }
  }, [fetchThreads]);

  const forkThread = useCallback(async (
    sourceContextId: string,
    title: string,
    forkType: ForkType,
    forkFromMessageId?: string
  ): Promise<string | null> => {
    try {
      const response = await axios.post("/api/contexts/fork", {
        source_context_id: sourceContextId,
        fork_from_message_id: forkFromMessageId,
        fork_type: forkType,
        title,
      });
      await fetchThreads();
      return response.data._id || response.data.id;
    } catch (error) {
      console.error("Failed to fork thread:", error);
      return null;
    }
  }, [fetchThreads]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  return {
    fetchThreads,
    createThread,
    renameThread,
    deleteThread,
    forkThread,
  };
}
