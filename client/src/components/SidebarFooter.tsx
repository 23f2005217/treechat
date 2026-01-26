import { useSidebarStore } from "../store/useSidebarStore";

export function SidebarFooter() {
  const { treeData } = useSidebarStore();

  const totalThreads = treeData.reduce((acc, item) => {
    if (item.type === "thread") return acc + 1;
    if (item.children) {
      return acc + item.children.filter((c) => c.type === "thread").length;
    }
    return acc;
  }, 0);

  return (
    <div className="p-4 border-t text-xs text-muted-foreground bg-muted/50">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium">Storage</span>
        <span className="font-mono">2.1GB / 5GB</span>
      </div>
      <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-300"
          style={{ width: "42%" }}
        />
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground/70">
        {totalThreads} threads total
      </div>
    </div>
  );
}
