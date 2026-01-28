import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FolderIcon, MessageSquare, GitFork } from "lucide-react";
import { TreeView, type TreeDataItem } from "./tree-view";
import { SidebarItemActions } from "./SidebarItemActions";
import { useSidebarStore } from "../store/useSidebarStore";
import { useFolders } from "../hooks/useFolders";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type SidebarTreeItem = ReturnType<typeof useSidebarStore.getState>["treeData"][number];

export function SidebarTree() {
  const treeData = useSidebarStore((state) => state.treeData);
  const searchQuery = useSidebarStore((state) => state.searchQuery);
  const expandedFolders = useSidebarStore((state) => state.expandedFolders);
  const navigate = useNavigate();
  const { addThreadToFolder } = useFolders();

  const filteredTreeData = useMemo(() => {
    if (!searchQuery.trim()) return treeData;

    const filterItem = (item: SidebarTreeItem): SidebarTreeItem | null => {
      const nameMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const filteredChildren = item.children?.map(filterItem).filter((child): child is SidebarTreeItem => child !== null);

      if (nameMatch || (filteredChildren && filteredChildren.length > 0)) {
        return filteredChildren ? { ...item, children: filteredChildren } : item;
      }
      return null;
    };

    return treeData.map(filterItem).filter((item): item is SidebarTreeItem => item !== null);
  }, [treeData, searchQuery]);

  const handleSelect = useCallback((item: TreeDataItem | undefined) => {
    if (!item) return;
    const typedItem = item as SidebarTreeItem;
    const { toggleFolder } = useSidebarStore.getState();

    if (typedItem.type === "thread") {
      navigate(`/thread/${typedItem.id}`);
    } else if (typedItem.type === "folder") {
      toggleFolder(typedItem.id);
    }
  }, [navigate]);

  const handleDrag = useCallback((sourceItem: TreeDataItem, targetItem: TreeDataItem) => {
    const source = sourceItem as SidebarTreeItem;
    const target = targetItem as SidebarTreeItem;

    if (target.type !== "folder" || source.type !== "thread") {
      return;
    }

    addThreadToFolder(target.id, source.id);
  }, [addThreadToFolder]);

  const renderItem = useCallback((params: { item: TreeDataItem }) => {
    const { item } = params;
    const typedItem = item as SidebarTreeItem;
    const isFolder = typedItem.type === "folder";
    const isFork = typedItem.type === "thread" && typedItem.parentContextId;

    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isFork && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                <GitFork className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {typedItem.forkType === "summary" ? "Summary" : typedItem.forkType === "full" ? "Full" : "Fork"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="text-xs">
                <div className="font-medium">Forked from: {typedItem.parentTitle}</div>
                <div className="text-muted-foreground mt-1">
                  Type: {typedItem.forkType || "fork"}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
        <span className="text-sm truncate">{item.name}</span>
        {isFolder && typedItem.children && typedItem.children.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {typedItem.children.length}
          </span>
        )}
        <SidebarItemActions item={item} />
      </div>
    );
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
      <TreeView
        data={filteredTreeData}
        expandAll={false}
        expandedItemIds={Array.from(expandedFolders)}
        defaultLeafIcon={MessageSquare}
        defaultNodeIcon={FolderIcon}
        onSelectChange={handleSelect}
        onDocumentDrag={handleDrag}
        renderItem={renderItem}
        className="p-2"
      />
    </div>
  );
}
