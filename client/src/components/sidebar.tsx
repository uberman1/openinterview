import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/", icon: "📊" },
  { name: "Health Check", href: "/health", icon: "💓" },
  { name: "Adapters", href: "/adapters", icon: "🔌" },
  { name: "Feature Flags", href: "/flags", icon: "🏁" },
  { name: "Self Tests", href: "/tests", icon: "🧪" },
  { name: "Logs", href: "/logs", icon: "📝" },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">OI</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">OpenInterview</h1>
            <p className="text-xs text-muted-foreground">Module 0 Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href}>
            <a
              data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
                location === item.href
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <span className="w-5 h-5">{item.icon}</span>
              <span>{item.name}</span>
            </a>
          </Link>
        ))}
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span data-testid="system-status">System Healthy</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          <span data-testid="version">v0.1.0</span> • 
          <span data-testid="environment">development</span>
        </div>
      </div>
    </div>
  );
}
