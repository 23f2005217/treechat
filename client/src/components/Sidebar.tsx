import { SidebarHeader } from "./SidebarHeader";
import { SidebarTree } from "./SidebarTree";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarDialogs } from "./SidebarDialogs";
import { useSidebarStore } from "../store/useSidebarStore";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { setCreateDialog } = useSidebarStore();

  const handleAddThread = () => {
    setCreateDialog({ isOpen: true, parentId: null, type: "thread" });
  };

  const handleAddFolder = () => {
    setCreateDialog({ isOpen: true, parentId: null, type: "folder" });
  };

  return (
    <>
      <div className={`border-r bg-card flex flex-col ${isCollapsed ? "w-16" : "w-72"}`}>
        <SidebarHeader
          isCollapsed={isCollapsed}
          onToggle={onToggle}
          onAddThread={handleAddThread}
          onAddFolder={handleAddFolder}
        />
        {!isCollapsed && (
          <>
            <SidebarTree />
            <SidebarFooter />
          </>
        )}
      </div>
    </>
  );
}

export { SidebarDialogs };
