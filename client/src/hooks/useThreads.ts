import { useEffect, useCallback } from "react";
import axios from "axios";
import { useSidebarStore } from "../store/useSidebarStore";
import { MessageSquare, Folder } from "lucide-react";

interface BackendContext {
  _id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useThreads() {
  const setTreeData = useSidebarStore((state) => state.setTreeData);

  const fetchThreads = useCallback(async () => {
    try {
      const response = await axios.get<BackendContext[]>("/api/contexts/");
      const threads = response.data.map((ctx) => ({
        id: ctx._id,
        name: ctx.title || "Untitled Thread",
        icon: MessageSquare,
        type: "thread" as const,
        createdAt: new Date(ctx.created_at).getTime(),
        updatedAt: new Date(ctx.updated_at).getTime(),
      }));

      setTreeData([
        {
          id: "all",
          name: "All Threads",
          icon: Folder,
          type: "folder" as const,
          children: threads,
        },
        {
          id: "college",
          name: "College",
          icon: Folder,
          type: "folder" as const,
          children: [],
        },
        {
          id: "household",
          name: "Household",
          icon: Folder,
          type: "folder" as const,
          children: [],
        },
        {
          id: "projects",
          name: "Projects",
          icon: Folder,
          type: "folder" as const,
          children: [],
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

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  return {
    fetchThreads,
    createThread,
    renameThread,
    deleteThread,
  };
}
