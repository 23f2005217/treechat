import { Outlet, Link, useLocation } from "react-router-dom";
import { MessageSquare, CheckSquare, Search, Settings, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const AppLayout = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Chat", path: "/" },
    { icon: CheckSquare, label: "Tasks", path: "/tasks" },
    { icon: Search, label: "Search", path: "/search" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-primary">TreeChat</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                location.pathname === item.path 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
