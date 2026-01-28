import { useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useSidebarStore, type SidebarTreeItem } from "../store/useSidebarStore";
import { FolderIcon, MessageSquare, GitFork } from "lucide-react";

interface BackendFolder {
  _id: string;
  name: string;
  description?: string;
  thread_ids: string[];
  order: number;
  created_at: string;
  updated_at: string;
}

interface BackendContext {
  _id: string;
  title: string;
  created_at: string;
  updated_at: string;
  parent_context_id?: string | null;
  fork_type?: string | null;
  folder_id?: string | null;
}

export function useFolders() {
  const setTreeData = useSidebarStore((state) => state.setTreeData);
  const hasFetched = useRef(false);
  const isFetching = useRef(false);

  const fetchFolders = useCallback(async (force = false) => {
    if (!force && hasFetched.current && isFetching.current) {
      return;
    }
    
    isFetching.current = true;
    
    try {
      const [foldersRes, contextsRes] = await Promise.all([
        axios.get<BackendFolder[]>("/api/folders/"),
        axios.get<BackendContext[]>("/api/contexts/"),
      ]);

      const folders = foldersRes.data;
      const contexts = contextsRes.data;

      const contextMap = new Map(contexts.map(ctx => [ctx._id, ctx]));

      const buildFolderTree = (): SidebarTreeItem[] => {
        const rootContexts = contexts.filter(ctx => !ctx.folder_id);

        const allThreadsTreeItem: SidebarTreeItem = {
          id: "all",
          name: "All Threads",
          icon: FolderIcon,
          type: "folder",
          children: buildThreadTree(rootContexts, contextMap),
        };

        const userFolders: SidebarTreeItem[] = folders.map(folder => {
          const folderContexts = contexts.filter(ctx => ctx.folder_id === folder._id);
          return {
            id: folder._id,
            name: folder.name,
            icon: FolderIcon,
            type: "folder",
            children: buildThreadTree(folderContexts, contextMap),
          };
        });

        return [allThreadsTreeItem, ...userFolders];
      };

      const folderIdsToExpand = new Set<string>(["all"]);
      folders.forEach(folder => folderIdsToExpand.add(folder._id));

      setTreeData(buildFolderTree());
      useSidebarStore.getState().setExpandedFolders(folderIdsToExpand);
      hasFetched.current = true;
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    } finally {
      isFetching.current = false;
    }
  }, [setTreeData]);

  const createFolder = useCallback(async (name: string, description?: string): Promise<string | null> => {
    try {
      const response = await axios.post("/api/folders/", {
        name,
        description,
        order: 0,
      });
      
      const newFolderId = response.data._id || response.data.id;
      
      const newFolder: SidebarTreeItem = {
        id: newFolderId,
        name,
        icon: FolderIcon,
        type: "folder",
        children: [],
      };
      
      setTreeData((prevData) => [...prevData, newFolder]);
      
      await fetchFolders(true);
      
      return newFolderId;
    } catch (error) {
      console.error("Failed to create folder:", error);
      await fetchFolders(true);
      return null;
    }
  }, [setTreeData, fetchFolders]);

  const renameFolder = useCallback(async (folderId: string, newName: string) => {
    try {
      await axios.patch(`/api/folders/${folderId}`, {
        name: newName,
      });
      
      setTreeData((prevData) => 
        prevData.map(item => 
          item.id === folderId ? { ...item, name: newName } : item
        )
      );
      
      await fetchFolders(true);
    } catch (error) {
      console.error("Failed to rename folder:", error);
      await fetchFolders(true);
    }
  }, [setTreeData, fetchFolders]);

  const deleteFolder = useCallback(async (folderId: string) => {
    try {
      await axios.delete(`/api/folders/${folderId}`);
      
      setTreeData((prevData) => prevData.filter(item => item.id !== folderId));
      
      await fetchFolders(true);
    } catch (error) {
      console.error("Failed to delete folder:", error);
      await fetchFolders(true);
    }
  }, [setTreeData, fetchFolders]);

  const addThreadToFolder = useCallback(async (folderId: string, threadId: string) => {
    try {
      await axios.post(`/api/folders/${folderId}/threads`, {
        thread_id: threadId,
      });
      
      await fetchFolders(true);
    } catch (error) {
      console.error("Failed to add thread to folder:", error);
      await fetchFolders(true);
    }
  }, [fetchFolders]);

  const removeThreadFromFolder = useCallback(async (folderId: string, threadId: string) => {
    try {
      await axios.delete(`/api/folders/${folderId}/threads/${threadId}`);
      
      await fetchFolders(true);
    } catch (error) {
      console.error("Failed to remove thread from folder:", error);
      await fetchFolders(true);
    }
  }, [fetchFolders]);

  useEffect(() => {
    fetchFolders();
  }, []);

  return {
    fetchFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    addThreadToFolder,
    removeThreadFromFolder,
  };
}

function buildThreadTree(contexts: BackendContext[], contextMap: Map<string, BackendContext>): SidebarTreeItem[] {
  const rootContexts = contexts.filter(ctx => !ctx.parent_context_id);
  const forkedContexts = contexts.filter(ctx => ctx.parent_context_id);

  const buildThreadItem = (ctx: BackendContext): SidebarTreeItem => {
    const children = forkedContexts
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

  return rootContexts.map(ctx => buildThreadItem(ctx));
}
