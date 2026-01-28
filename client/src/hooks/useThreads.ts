import { useEffect, useCallback, useRef } from "react";
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
  const hasFetched = useRef(false);
  const isFetching = useRef(false);

  const fetchThreads = useCallback(async (force = false) => {
    if (!force && hasFetched.current && isFetching.current) {
      return;
    }
    
    isFetching.current = true;
    
    try {
      const response = await axios.get<BackendContext[]>("/api/contexts/");
      const contexts = response.data;
      
      const contextMap = new Map(contexts.map(ctx => [ctx._id, ctx]));
      
      const rootThreads = contexts.filter(ctx => !ctx.parent_context_id);
      const forkedThreads = contexts.filter(ctx => ctx.parent_context_id);
      
      const buildThreadItem = (ctx: BackendContext): SidebarTreeItem => {
        const children = forkedThreads
          .filter(child => child.parent_context_id === ctx._id)
          .map(child => buildThreadItem(child));
        
        let parentContextId = null;
        let parentTitle = null;
        let forkType = null;
        
        if (ctx.parent_context_id) {
          const parent = contextMap.get(ctx.parent_context_id);
          if (parent) {
            parentContextId = ctx.parent_context_id;
            parentTitle = parent.title;
            forkType = ctx.fork_type;
          }
        }
        
        return {
          id: ctx._id,
          name: ctx.title || "Untitled Thread",
          icon: ctx.parent_context_id ? GitFork : MessageSquare,
          type: "thread" as const,
          createdAt: new Date(ctx.created_at).getTime(),
          updatedAt: new Date(ctx.updated_at).getTime(),
          children: children.length > 0 ? children : undefined,
          parentContextId,
          parentTitle,
          forkType,
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
      
      hasFetched.current = true;
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    } finally {
      isFetching.current = false;
    }
  }, [setTreeData]);

  const createThread = useCallback(async (title: string): Promise<string | null> => {
    try {
      const response = await axios.post("/api/contexts/", { title });
      const newThreadId = response.data._id || response.data.id;
      
      const newThread: SidebarTreeItem = {
        id: newThreadId,
        name: title || "Untitled Thread",
        icon: MessageSquare,
        type: "thread" as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      setTreeData((prevData) => 
        prevData.map(item => 
          item.id === "all" ? {
            ...item,
            children: [...(item.children || []), newThread]
          } : item
        )
      );
      
      await fetchThreads(true);
      return newThreadId;
    } catch (error) {
      console.error("Failed to create thread:", error);
      await fetchThreads(true);
      return null;
    }
  }, [setTreeData, fetchThreads]);

  const renameThread = useCallback(async (threadId: string, newTitle: string) => {
    try {
      await axios.patch(`/api/contexts/${threadId}`, null, {
        params: { title: newTitle }
      });
      
      const updateThread = (items: SidebarTreeItem[]): SidebarTreeItem[] => {
        return items.map(item => {
          if (item.type === "thread" && item.id === threadId) {
            return { ...item, name: newTitle };
          }
          if (item.children) {
            return { ...item, children: updateThread(item.children) };
          }
          return item;
        });
      };
      
      setTreeData(updateThread);
      
      await fetchThreads(true);
    } catch (error) {
      console.error("Failed to rename thread:", error);
      await fetchThreads(true);
    }
  }, [setTreeData, fetchThreads]);

  const deleteThread = useCallback(async (threadId: string) => {
    try {
      await axios.delete(`/api/contexts/${threadId}`);
      
      const removeThread = (items: SidebarTreeItem[]): SidebarTreeItem[] => {
        return items
          .filter(item => !(item.type === "thread" && item.id === threadId))
          .map(item => 
            item.children ? { ...item, children: removeThread(item.children) } : item
          );
      };
      
      setTreeData(removeThread);
      
      await fetchThreads(true);
    } catch (error) {
      console.error("Failed to delete thread:", error);
      await fetchThreads(true);
    }
  }, [setTreeData, fetchThreads]);

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
      const newThreadId = response.data._id || response.data.id;
      
      const newFork: SidebarTreeItem = {
        id: newThreadId,
        name: title,
        icon: GitFork,
        type: "thread" as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const addForkToThread = (items: SidebarTreeItem[]): SidebarTreeItem[] => {
        return items.map(item => {
          if (item.type === "thread" && item.id === sourceContextId) {
            return {
              ...item,
              children: [...(item.children || []), newFork]
            };
          }
          if (item.children) {
            return { ...item, children: addForkToThread(item.children) };
          }
          return item;
        });
      };
      
      setTreeData(addForkToThread);
      
      await fetchThreads(true);
      return newThreadId;
    } catch (error) {
      console.error("Failed to fork thread:", error);
      await fetchThreads(true);
      return null;
    }
  }, [setTreeData, fetchThreads]);

  useEffect(() => {
    fetchThreads();
  }, []);

    return {
      fetchThreads,
      createThread,
      renameThread,
      deleteThread,
      forkThread,
    };
  }

