import { useCallback } from "react";
import { useSidebarStore, type SidebarTreeItem } from "../store/useSidebarStore";
import { useNavigate } from "react-router-dom";

export function useNavigation() {
  const navigate = useNavigate();
  const { expandedFolders, treeData, toggleFolder, setExpandedFolders } = useSidebarStore();

  // Find the path of folder IDs from root to a specific thread
  const findPathToThread = useCallback((threadId: string): string[] => {
    const path: string[] = [];
    
    const findPath = (items: SidebarTreeItem[], currentPath: string[]): boolean => {
      for (const item of items) {
        if (item.id === threadId) {
          path.push(...currentPath);
          return true;
        }
        if (item.children && item.type === "folder") {
          if (findPath(item.children, [...currentPath, item.id])) {
            return true;
          }
        }
        // Also check thread children (forked threads)
        if (item.children && item.type === "thread") {
          if (findPath(item.children, currentPath)) {
            return true;
          }
        }
      }
      return false;
    };
    
    findPath(treeData, []);
    return path;
  }, [treeData]);

  // Navigate to thread and expand all parent folders
  const navigateToThread = useCallback((threadId: string) => {
    // Find and expand all parent folders
    const pathToThread = findPathToThread(threadId);
    if (pathToThread.length > 0) {
      const newExpanded = new Set(expandedFolders);
      pathToThread.forEach(folderId => newExpanded.add(folderId));
      setExpandedFolders(newExpanded);
    }
    navigate(`/thread/${threadId}`);
  }, [navigate, findPathToThread, expandedFolders, setExpandedFolders]);

  const navigateToHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const findThread = useCallback((threadId: string): SidebarTreeItem | null => {
    const findItem = (items: SidebarTreeItem[]): SidebarTreeItem | null => {
      for (const item of items) {
        if (item.id === threadId) return item;
        if (item.children) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findItem(treeData);
  }, [treeData]);

  const getAllThreads = useCallback((): SidebarTreeItem[] => {
    const threads: SidebarTreeItem[] = [];
    const collectThreads = (items: SidebarTreeItem[]) => {
      for (const item of items) {
        if (item.type === "thread") {
          threads.push(item);
        }
        if (item.children) {
          collectThreads(item.children);
        }
      }
    };
    collectThreads(treeData);
    return threads;
  }, [treeData]);

  // Get recent threads sorted by updatedAt
  const getRecentThreads = useCallback((limit: number = 5): SidebarTreeItem[] => {
    const allThreads = getAllThreads();
    return allThreads
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, limit);
  }, [getAllThreads]);

  return {
    navigateToThread,
    navigateToHome,
    findThread,
    getAllThreads,
    getRecentThreads,
    findPathToThread,
    expandedFolders,
    toggleFolder,
    setExpandedFolders,
  };
}
