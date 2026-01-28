import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { useSidebarStore } from "../store/useSidebarStore";
import { useThreads } from "../hooks/useThreads";
import { useFolders } from "../hooks/useFolders";

export function SidebarDialogs() {
  const {
    createDialog,
    renameDialog,
    deleteDialog,
    newItemName,
    setCreateDialog,
    setRenameDialog,
    setDeleteDialog,
    setNewItemName,
    treeData,
  } = useSidebarStore();

  const { createThread, renameThread, deleteThread } = useThreads();
  const { createFolder, renameFolder, deleteFolder } = useFolders();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Helper to find item type from tree data
  const findItemType = useCallback((itemId: string): "folder" | "thread" | null => {
    const findInTree = (items: typeof treeData): "folder" | "thread" | null => {
      for (const item of items) {
        if (item.id === itemId) return item.type;
        if (item.children) {
          const found = findInTree(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findInTree(treeData);
  }, [treeData]);

  const handleCreateItem = async () => {
    // Don't allow creating threads with empty names - navigate to new thread page instead
    if (createDialog.type === "thread" && !newItemName.trim()) {
      // For threads, navigate to the thread page where user can start typing
      setCreateDialog({ isOpen: false, parentId: null, type: "thread" });
      setNewItemName("");
      navigate("/thread/new");
      return;
    }
    
    if (createDialog.type === "folder" && !newItemName.trim()) return;
    
    setIsLoading(true);

    try {
      if (createDialog.type === "thread") {
        const threadId = await createThread(newItemName.trim());
        setCreateDialog({ isOpen: false, parentId: null, type: "thread" });
        setNewItemName("");
        if (threadId) {
          navigate(`/thread/${threadId}`);
        }
      } else {
        await createFolder(newItemName.trim());
        setCreateDialog({ isOpen: false, parentId: null, type: "folder" });
        setNewItemName("");
      }
    } catch (error) {
      console.error("Failed to create item:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameItem = async () => {
    if (!renameDialog.currentName.trim()) return;
    setIsLoading(true);

    try {
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(renameDialog.itemId);
      if (isMongoId) {
        // Find the actual item type from tree data instead of using deleteDialog.type
        const itemType = findItemType(renameDialog.itemId);
        if (itemType === "folder") {
          await renameFolder(renameDialog.itemId, renameDialog.currentName.trim());
        } else {
          await renameThread(renameDialog.itemId, renameDialog.currentName.trim());
        }
      }
      setRenameDialog({ isOpen: false, itemId: "", currentName: "" });
    } catch (error) {
      console.error("Failed to rename item:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    setIsLoading(true);

    try {
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(deleteDialog.itemId);
      if (isMongoId) {
        if (deleteDialog.type === "folder") {
          await deleteFolder(deleteDialog.itemId);
        } else {
          await deleteThread(deleteDialog.itemId);
          navigate("/");
        }
      }
      setDeleteDialog({ isOpen: false, itemId: "", itemName: "", type: "thread" });
    } catch (error) {
      console.error("Failed to delete item:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Create Dialog */}
      <Dialog
        open={createDialog.isOpen}
        onOpenChange={(open) => !open && setCreateDialog({ isOpen: false, parentId: null, type: "thread" })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create New {createDialog.type === "folder" ? "Folder" : "Thread"}
            </DialogTitle>
          </DialogHeader>
          <Input
            placeholder={`${createDialog.type === "folder" ? "Folder" : "Thread"} name`}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateItem()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog({ isOpen: false, parentId: null, type: "thread" })} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleCreateItem} disabled={isLoading}>
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog
        open={renameDialog.isOpen}
        onOpenChange={(open) => !open && setRenameDialog({ isOpen: false, itemId: "", currentName: "" })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="New name"
            value={renameDialog.currentName}
            onChange={(e) => setRenameDialog({ isOpen: true, itemId: renameDialog.itemId, currentName: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleRenameItem()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog({ isOpen: false, itemId: "", currentName: "" })} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleRenameItem} disabled={isLoading}>
              {isLoading ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, itemId: "", itemName: "", type: "thread" })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteDialog.type}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{deleteDialog.itemName}"? This action cannot be undone.
            {deleteDialog.type === "folder" && " All threads inside will also be deleted."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ isOpen: false, itemId: "", itemName: "", type: "thread" })} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
