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
            onKeyDown={(e) => e.key === "Enter" && createItem()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog({ isOpen: false, parentId: null, type: "thread" })}>
              Cancel
            </Button>
            <Button onClick={createItem}>Create</Button>
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
            onKeyDown={(e) => e.key === "Enter" && renameItem()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog({ isOpen: false, itemId: "", currentName: "" })}>
              Cancel
            </Button>
            <Button onClick={renameItem}>Rename</Button>
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
            <Button variant="outline" onClick={() => setDeleteDialog({ isOpen: false, itemId: "", itemName: "", type: "thread" })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteItem}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
