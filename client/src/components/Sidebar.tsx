import { Plus, Folder, MessageSquare, Filter } from "lucide-react";
import { Button } from "./ui/button";
import { TreeView, type TreeDataItem } from "./tree-view";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const mockTreeData: TreeDataItem[] = [
  {
    id: "all",
    name: "All Threads",
    icon: Folder,
    children: [
      {
        id: "thread-1",
        name: "College Planning",
        icon: MessageSquare,
      },
      {
        id: "thread-2", 
        name: "Household Tasks",
        icon: MessageSquare,
      },
      {
        id: "thread-3",
        name: "AI Project Ideas",
        icon: MessageSquare,
      },
    ],
  },
  {
    id: "college",
    name: "College",
    icon: Folder,
    children: [
      {
        id: "thread-1",
        name: "College Planning",
        icon: MessageSquare,
      },
    ],
  },
  {
    id: "household",
    name: "Household",
    icon: Folder,
    children: [
      {
        id: "thread-2",
        name: "Household Tasks",
        icon: MessageSquare,
      },
    ],
  },
  {
    id: "projects",
    name: "Projects",
    icon: Folder,
    children: [
      {
        id: "thread-3",
        name: "AI Project Ideas",
        icon: MessageSquare,
      },
    ],
  },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  if (isCollapsed) {
    return (
      <div className="w-16 border-r bg-card flex flex-col items-center py-4">
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
          className="mb-2"
          aria-label="New thread"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Threads</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label="Collapse sidebar"
          >
            <Folder className="h-4 w-4" />
          </Button>
        </div>

        <Button className="w-full mb-3" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Thread
        </Button>

        {/* Filter */}
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">All</span>
        </div>
      </div>

      {/* Tree Navigation */}
      <div className="flex-1 overflow-y-auto">
        <TreeView
          data={mockTreeData}
          className="p-2"
          onSelectChange={(item) => {
            if (item && item.id.startsWith("thread-")) {
              // Navigate to thread
              window.location.href = `/thread/${item.id}`;
            }
          }}
        />
      </div>

      {/* Footer */}
      <div className="p-3 border-t text-xs text-muted-foreground bg-muted">
        <div className="flex justify-between items-center mb-1">
          <span>Storage</span>
          <span className="font-mono">2.1GB / 5GB</span>
        </div>
        <div className="w-full bg-border rounded-full h-1">
          <div 
            className="bg-primary h-1 rounded-full" 
            style={{ width: '42%' }}
          />
        </div>
      </div>
    </div>
  );
}