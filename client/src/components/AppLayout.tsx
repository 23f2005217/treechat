import { useState } from "react";
import { Sidebar, SidebarDialogs } from "../components/Sidebar";
import { ThemeToggle } from "../components/ThemeToggle";
import { HomeContent } from "../components/HomeContent";
import { useThemeStore } from "../store/useThemeStore";

interface AppLayoutProps {
  children?: React.ReactNode;
  showHome?: boolean;
}

export default function AppLayout({ children, showHome = false }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { resolvedTheme } = useThemeStore();

  return (
    <div className={`min-h-screen flex flex-col ${resolvedTheme}`}>
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">TreeChat</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <main className="flex-1 overflow-hidden bg-background">
          {showHome ? <HomeContent /> : children}
        </main>
        <SidebarDialogs />
      </div>
    </div>
  );
}
