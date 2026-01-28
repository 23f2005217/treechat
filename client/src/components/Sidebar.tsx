import { X } from "lucide-react";
import { Button } from "./ui/button";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarTree } from "./SidebarTree";
import { SidebarFooter } from "./SidebarFooter";
import { SidebarDialogs } from "./SidebarDialogs";
import { useSidebarStore } from "../store/useSidebarStore";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isCollapsed, onToggle, isMobile = false, onClose }: SidebarProps) {
  const { setCreateDialog } = useSidebarStore();

  const handleAddThread = () => {
    setCreateDialog({ isOpen: true, parentId: null, type: "thread" });
  };

  const handleAddFolder = () => {
    setCreateDialog({ isOpen: true, parentId: null, type: "folder" });
  };

  return (
    <>
      <div className={`border-r bg-card flex flex-col ${isMobile ? "w-72" : isCollapsed ? "w-16" : "w-72"} h-full`}>
        {/* Close button for mobile */}
        {isMobile && (
          <div className="flex justify-end p-2 border-b lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}
        <SidebarHeader
          isCollapsed={isCollapsed}
          onToggle={onToggle}
          onAddThread={handleAddThread}
          onAddFolder={handleAddFolder}
          isMobile={isMobile}
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
