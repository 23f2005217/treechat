import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { AppHeader } from "../components/AppHeader";
import { Sidebar, SidebarDialogs } from "../components/Sidebar";
import { useThemeStore } from "../store/useThemeStore";
import { useFolders } from "../hooks/useFolders";

const AppLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const location = useLocation();
  
  // Initialize folders/threads on mount
  const { fetchFolders } = useFolders();
  
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // Initialize theme from system preference or stored value
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const handleThemeToggle = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  const toggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={`
          fixed lg:relative lg:flex flex-col bg-card border-r z-50 
          transition-transform duration-300 ease-in-out
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:hidden
          h-full w-72
        `}
        aria-label="Mobile navigation"
      >
        <Sidebar 
          isCollapsed={false}
          onToggle={toggleMobileSidebar}
          isMobile={true}
          onClose={closeMobileSidebar}
        />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex" aria-label="Desktop navigation">
        <Sidebar 
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebarCollapse}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <AppHeader 
          onThemeToggle={handleThemeToggle}
          isDark={resolvedTheme === 'dark'}
          onMobileMenuClick={toggleMobileSidebar}
          isMobileSidebarOpen={isMobileSidebarOpen}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* Sidebar Dialogs (Create, Rename, Delete) */}
      <SidebarDialogs />
    </div>
  );
};

export default AppLayout;
