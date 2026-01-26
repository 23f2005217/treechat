import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, FolderPlus, Plus } from "lucide-react";
import type { TreeDataItem } from "./tree-view";
import { useSidebarStore } from "../store/useSidebarStore";

interface SidebarItemActionsProps {
  item: TreeDataItem;
}

type SidebarTreeItem = ReturnType<typeof useSidebarStore.getState>["treeData"][number];

export function SidebarItemActions({ item }: SidebarItemActionsProps) {
  const { setRenameDialog, setDeleteDialog, setCreateDialog, toggleFolder } = useSidebarStore();
  const typedItem = item as SidebarTreeItem;
  const isFolder = typedItem.type === "folder";

  const handleRename = () => {
    setRenameDialog({
      isOpen: true,
      itemId: item.id,
      currentName: item.name,
    });
  };

  const handleDelete = () => {
    setDeleteDialog({
      isOpen: true,
      itemId: item.id,
      itemName: item.name,
      type: isFolder ? "folder" : "thread",
    });
  };

  const handleAddFolder = () => {
    setCreateDialog({
      isOpen: true,
      parentId: item.id,
      type: "folder",
    });
    toggleFolder(item.id);
  };

  const handleAddThread = () => {
    setCreateDialog({
      isOpen: true,
      parentId: item.id,
      type: "thread",
    });
    toggleFolder(item.id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-accent ml-auto rounded-md flex items-center justify-center cursor-pointer"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
            }
          }}
        >
          <MoreHorizontal className="h-3 w-3" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleRename}>
          <Pencil className="mr-2 h-3 w-3" />
          Rename
        </DropdownMenuItem>
        {isFolder && (
          <>
            <DropdownMenuItem onClick={handleAddFolder}>
              <FolderPlus className="mr-2 h-3 w-3" />
              New Folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddThread}>
              <Plus className="mr-2 h-3 w-3" />
              New Thread
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
          <Trash2 className="mr-2 h-3 w-3" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
