import { useSidebarStore } from "../store/useSidebarStore";
import { useNavigate } from "react-router-dom";

export function useNavigation() {
  const navigate = useNavigate();
  const { expandedFolders, treeData, toggleFolder } = useSidebarStore();

  const navigateToThread = (threadId: string) => {
    navigate(`/thread/${threadId}`);
  };

  const navigateToHome = () => {
    navigate("/");
  };

  const findThread = (threadId: string) => {
    const findItem = (items: any[]): any => {
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
  };

  const getAllThreads = () => {
    const threads: any[] = [];
    const collectThreads = (items: any[]) => {
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
  };

  return {
    navigateToThread,
    navigateToHome,
    findThread,
    getAllThreads,
    expandedFolders,
    toggleFolder,
  };
}
