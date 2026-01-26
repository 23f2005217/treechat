import { useState } from "react";
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
    createItem,
    renameItem,
    deleteItem,
  } = useSidebarStore();
  
  const { createThread, renameThread, deleteThread } = useThreads();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateItem = async () => {
    if (!newItemName.trim()) return;
    setIsLoading(true);
    
    if (createDialog.type === "thread") {
      const threadId = await createThread(newItemName.trim());
      setCreateDialog({ isOpen: false, parentId: null, type: "thread" });
      setNewItemName("");
      if (threadId) {
        navigate(`/thread/${threadId}`);
      }
    } else {
      createItem();
    }
    setIsLoading(false);
  };

  const handleRenameItem = async () => {
    if (!renameDialog.currentName.trim()) return;
    setIsLoading(true);
    
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(renameDialog.itemId);
    if (isMongoId) {
      await renameThread(renameDialog.itemId, renameDialog.currentName.trim());
      setRenameDialog({ isOpen: false, itemId: "", currentName: "" });
    } else {
      renameItem();
    }
    setIsLoading(false);
  };

  const handleDeleteItem = async () => {
    setIsLoading(true);
    
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(deleteDialog.itemId);
    if (isMongoId && deleteDialog.type === "thread") {
      await deleteThread(deleteDialog.itemId);
      setDeleteDialog({ isOpen: false, itemId: "", itemName: "", type: "thread" });
      navigate("/");
    } else {
      deleteItem();
    }
    setIsLoading(false);
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
