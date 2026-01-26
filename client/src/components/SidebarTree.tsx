import { Folder, MessageSquare } from "lucide-react";
import { TreeView, type TreeDataItem } from "./tree-view";
import { SidebarItemActions } from "./SidebarItemActions";
import { useSidebarStore } from "../store/useSidebarStore";

type SidebarTreeItem = ReturnType<typeof useSidebarStore.getState>["treeData"][number];

export function SidebarTree() {
  const { treeData, searchQuery } = useSidebarStore();

  const filteredTreeData = useMemoFiltered(treeData, searchQuery);

  return (
    <div className="flex-1 overflow-y-auto">
      <TreeView
        data={filteredTreeData}
        expandAll={!!searchQuery}
        defaultLeafIcon={MessageSquare}
        defaultNodeIcon={Folder}
        onSelectChange={handleSelectChange}
        onDocumentDrag={handleDrag}
        renderItem={renderItem}
        className="p-2"
      />
    </div>
  );
}

function useMemoFiltered(items: SidebarTreeItem[], query: string) {
  if (!query.trim()) return items;

  const filterItem = (item: SidebarTreeItem): SidebarTreeItem | null => {
    const nameMatch = item.name.toLowerCase().includes(query.toLowerCase());
    const filteredChildren = item.children?.map(filterItem).filter((child): child is SidebarTreeItem => child !== null);

    if (nameMatch || (filteredChildren && filteredChildren.length > 0)) {
      return filteredChildren ? { ...item, children: filteredChildren } : item;
    }
    return null;
  };

  return items.map(filterItem).filter((item): item is SidebarTreeItem => item !== null);
}

function handleSelectChange(item: TreeDataItem | undefined) {
  if (!item) return;
  const typedItem = item as SidebarTreeItem;
  const { toggleFolder } = useSidebarStore.getState();

  if (typedItem.type === "thread") {
    window.location.href = `/thread/${typedItem.id}`;
  } else if (typedItem.type === "folder") {
    toggleFolder(typedItem.id);
  }
}

function handleDrag(sourceItem: TreeDataItem, targetItem: TreeDataItem) {
  const { treeData, addItemToFolder } = useSidebarStore.getState();
  const source = sourceItem as SidebarTreeItem;
  const target = targetItem as SidebarTreeItem;

  if (target.type !== "folder" || source.type !== "thread") {
    return;
  }

  const removeItem = (items: SidebarTreeItem[]): SidebarTreeItem[] => {
    return items
      .filter((item) => item.id !== source.id)
      .map((item) => {
        if (item.children) {
          return { ...item, children: removeItem(item.children) };
        }
        return item;
      });
  };

  addItemToFolder(target.id, source);
  useSidebarStore.setState({ treeData: removeItem(treeData) });
}

function renderItem(params: { item: TreeDataItem }) {
  const { item } = params;
  const typedItem = item as SidebarTreeItem;
  const isFolder = typedItem.type === "folder";

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <span className="text-sm truncate">{item.name}</span>
      {isFolder && typedItem.children && typedItem.children.length > 0 && (
        <span className="text-xs text-muted-foreground ml-auto">
          {typedItem.children.length}
        </span>
      )}
      <SidebarItemActions item={item} />
    </div>
  );
}
