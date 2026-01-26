import { Plus, Search, X, FolderPlus, Folder } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useSidebarStore } from "../store/useSidebarStore";

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onAddThread: () => void;
  onAddFolder: () => void;
}

export function SidebarHeader({ isCollapsed, onToggle, onAddThread, onAddFolder }: SidebarHeaderProps) {
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="mb-4"
          aria-label="Expand sidebar"
        >
          <Folder className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onAddThread}
          className="mb-2"
          aria-label="New thread"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 border-b space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Threads</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label="Collapse sidebar"
          className="h-8 w-8"
        >
          <Folder className="h-4 w-4" />
        </Button>
      </div>

      <Button className="w-full" size="sm" onClick={onAddThread}>
        <Plus className="h-4 w-4 mr-2" />
        New Thread
      </Button>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <SidebarSearch />
      </div>

      {/* New Folder Button */}
      <Button variant="outline" size="sm" className="w-full" onClick={onAddFolder}>
        <FolderPlus className="h-4 w-4 mr-2" />
        New Folder
      </Button>
    </div>
  );
}

function SidebarSearch() {
  const { searchQuery, setSearchQuery } = useSidebarStore();

  return (
    <>
      <Input
        placeholder="Search threads..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-9 h-9"
      />
      {searchQuery && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
          onClick={() => setSearchQuery("")}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </>
  );
}
