import { create } from "zustand";
import type { TreeDataItem } from "../components/tree-view";
import { Folder as FolderIcon, MessageSquare } from "lucide-react";

export interface SidebarTreeItem extends TreeDataItem {
  type: "folder" | "thread";
  children?: SidebarTreeItem[];
  createdAt?: number;
  updatedAt?: number;
  parentContextId?: string | null;
  parentTitle?: string | null;
  forkType?: string | null;
  forkedFromMessageId?: string | null;
}

interface SidebarState {
  treeData: SidebarTreeItem[];
  searchQuery: string;
  expandedFolders: Set<string>;

  createDialog: {
    isOpen: boolean;
    parentId: string | null;
    type: "folder" | "thread";
  };
  renameDialog: {
    isOpen: boolean;
    itemId: string;
    currentName: string;
  };
  deleteDialog: {
    isOpen: boolean;
    itemId: string;
    itemName: string;
    type: "folder" | "thread";
  };

  newItemName: string;

  setSearchQuery: (query: string) => void;
  toggleFolder: (itemId: string) => void;

  setCreateDialog: (dialog: SidebarState["createDialog"]) => void;
  setRenameDialog: (dialog: SidebarState["renameDialog"]) => void;
  setDeleteDialog: (dialog: SidebarState["deleteDialog"]) => void;

  setNewItemName: (name: string) => void;

  setTreeData: (data: SidebarTreeItem[] | ((prev: SidebarTreeItem[]) => SidebarTreeItem[])) => void;

  setExpandedFolders: (folders: Set<string>) => void;
  expandAllFolders: () => void;
  collapseAllFolders: () => void;

  createItem: () => void;
  renameItem: () => void;
  deleteItem: () => void;
}

const initialTreeData: SidebarTreeItem[] = [
  {
    id: "all",
    name: "All Threads",
    icon: FolderIcon,
    type: "folder",
    children: [],
  },
];

export const useSidebarStore = create<SidebarState>((set, get) => ({
  treeData: initialTreeData,
  searchQuery: "",
  expandedFolders: new Set<string>(["all"]),
  createDialog: {
    isOpen: false,
    parentId: null,
    type: "thread",
  },
  renameDialog: {
    isOpen: false,
    itemId: "",
    currentName: "",
  },
  deleteDialog: {
    isOpen: false,
    itemId: "",
    itemName: "",
    type: "thread",
  },
  newItemName: "",

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleFolder: (itemId) =>
    set((state) => {
      const newSet = new Set(state.expandedFolders);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return { expandedFolders: newSet };
    }),

  setCreateDialog: (dialog) => set({ createDialog: dialog }),
  setRenameDialog: (dialog) => set({ renameDialog: dialog }),
  setDeleteDialog: (dialog) => set({ deleteDialog: dialog }),

  setNewItemName: (name) => set({ newItemName: name }),

  setTreeData: (data) => set({ 
    treeData: typeof data === 'function' ? data(get().treeData) : data 
  }),

  expandAllFolders: () => {
    const { treeData } = get();
    const folderIds = new Set<string>();
    const collectFolderIds = (items: SidebarTreeItem[]) => {
      items.forEach(item => {
        if (item.type === "folder") {
          folderIds.add(item.id);
          if (item.children) {
            collectFolderIds(item.children);
          }
        }
      });
    };
    collectFolderIds(treeData);
    set({ expandedFolders: folderIds });
  },

  collapseAllFolders: () => set({ expandedFolders: new Set<string>() }),

  setExpandedFolders: (folders) => set({ expandedFolders: folders }),

  createItem: () => {
    const { createDialog, newItemName, treeData } = get();
    if (!newItemName.trim()) return;

    const newItem: SidebarTreeItem = {
      id: `folder-${Date.now()}`,
      name: newItemName.trim(),
      icon: createDialog.type === "folder" ? FolderIcon : MessageSquare,
      type: createDialog.type,
      children: createDialog.type === "folder" ? [] : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updateTree = (items: SidebarTreeItem[]): SidebarTreeItem[] => {
      if (createDialog.parentId === null) {
        return [...items, newItem];
      }

      return items.map((item) => {
        if (item.id === createDialog.parentId && item.type === "folder") {
          return {
            ...item,
            children: [...(item.children || []), newItem],
          };
        }
        if (item.children) {
          return { ...item, children: updateTree(item.children) };
        }
        return item;
      });
    };

    set({
      treeData: updateTree(treeData),
      createDialog: { isOpen: false, parentId: null, type: "thread" },
      newItemName: "",
    });
  },

  renameItem: () => {
    const { renameDialog, treeData } = get();
    if (!renameDialog.currentName.trim()) return;

    const updateTree = (items: SidebarTreeItem[]): SidebarTreeItem[] => {
      return items.map((item) => {
        if (item.id === renameDialog.itemId) {
          return { ...item, name: renameDialog.currentName.trim() };
        }
        if (item.children) {
          return { ...item, children: updateTree(item.children) };
        }
        return item;
      });
    };

    set({
      treeData: updateTree(treeData),
      renameDialog: { isOpen: false, itemId: "", currentName: "" },
    });
  },

  deleteItem: () => {
    const { deleteDialog, treeData } = get();

    const removeItem = (items: SidebarTreeItem[]): SidebarTreeItem[] => {
      return items
        .filter((item) => item.id !== deleteDialog.itemId)
        .map((item) => {
          if (item.children) {
            return { ...item, children: removeItem(item.children) };
          }
          return item;
        });
    };

    set({
      treeData: removeItem(treeData),
      deleteDialog: { isOpen: false, itemId: "", itemName: "", type: "thread" },
    });
  },

}));

export const selectTreeData = (state: SidebarState) => state.treeData;
export const selectSearchQuery = (state: SidebarState) => state.searchQuery;
export const selectExpandedFolders = (state: SidebarState) => state.expandedFolders;
export const selectCreateDialog = (state: SidebarState) => state.createDialog;
export const selectRenameDialog = (state: SidebarState) => state.renameDialog;
export const selectDeleteDialog = (state: SidebarState) => state.deleteDialog;