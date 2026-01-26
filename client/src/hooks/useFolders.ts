import { useEffect, useCallback } from "react";
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

  const fetchFolders = useCallback(async () => {
    try {
      const [foldersRes, contextsRes] = await Promise.all([
        axios.get<BackendFolder[]>("/api/folders/"),
        axios.get<BackendContext[]>("/api/contexts/"),
      ]);

      const folders = foldersRes.data;
      const contexts = contextsRes.data;

      // Create a map for quick context lookup
      const contextMap = new Map(contexts.map(ctx => [ctx._id, ctx]));

      // Collect folder IDs to expand
      const folderIdsToExpand = new Set<string>(["all"]);
      folders.forEach(folder => folderIdsToExpand.add(folder._id));

      // Build folder items with their threads
      const buildFolderTree = (): SidebarTreeItem[] => {
        // Create "All Threads" folder with all root contexts
        const rootContexts = contexts.filter(ctx => !ctx.folder_id);

        const allThreadsTreeItem: SidebarTreeItem = {
          id: "all",
          name: "All Threads",
          icon: FolderIcon,
          type: "folder",
          children: buildThreadTree(rootContexts, contextMap),
        };

        // Create user folders
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

      setTreeData(buildFolderTree());

      // Expand all folders by default
      useSidebarStore.getState().setExpandedFolders(folderIdsToExpand);
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  }, [setTreeData]);

  const createFolder = useCallback(async (name: string, description?: string): Promise<string | null> => {
    try {
      const response = await axios.post("/api/folders/", {
        name,
        description,
        order: 0,
      });
      await fetchFolders();
      return response.data._id || response.data.id;
    } catch (error) {
      console.error("Failed to create folder:", error);
      return null;
    }
  }, [fetchFolders]);

  const renameFolder = useCallback(async (folderId: string, newName: string) => {
    try {
      await axios.patch(`/api/folders/${folderId}`, {
        name: newName,
      });
      await fetchFolders();
    } catch (error) {
      console.error("Failed to rename folder:", error);
    }
  }, [fetchFolders]);

  const deleteFolder = useCallback(async (folderId: string) => {
    try {
      await axios.delete(`/api/folders/${folderId}`);
      await fetchFolders();
    } catch (error) {
      console.error("Failed to delete folder:", error);
    }
  }, [fetchFolders]);

  const addThreadToFolder = useCallback(async (folderId: string, threadId: string) => {
    try {
      await axios.post(`/api/folders/${folderId}/threads`, {
        thread_id: threadId,
      });
      await fetchFolders();
    } catch (error) {
      console.error("Failed to add thread to folder:", error);
    }
  }, [fetchFolders]);

  const removeThreadFromFolder = useCallback(async (folderId: string, threadId: string) => {
    try {
      await axios.delete(`/api/folders/${folderId}/threads/${threadId}`);
      await fetchFolders();
    } catch (error) {
      console.error("Failed to remove thread from folder:", error);
    }
  }, [fetchFolders]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

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
