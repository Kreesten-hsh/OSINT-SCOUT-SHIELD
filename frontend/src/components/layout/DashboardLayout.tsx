import { Link, useLocation, Outlet } from "react-router-dom";
import {
    ShieldAlert,
    LayoutDashboard,
    Search,
    BrainCircuit,
    Settings,
    Users,
    FileBox,
    LogOut,
    Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveFeedSidebar } from "@/components/dashboard/LiveFeedSidebar";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Alert } from "@/types/alert";

const NAV_ITEMS = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Alerts Console", icon: ShieldAlert, path: "/alerts" },
    { label: "Investigations", icon: Search, path: "/investigations" },
    { label: "Analytics", icon: BrainCircuit, path: "/analytics" },
    { label: "Detection Rules", icon: Settings, path: "/rules" },
    { label: "Reports", icon: FileBox, path: "/reports" },
];

export default function DashboardLayout() {
    const location = useLocation();

    // Fetch global alerts for the feed
    const { data: alerts } = useQuery({
        queryKey: ["alerts"],
        queryFn: async () => (await apiClient.get<Alert[]>("/alerts/")).data,
        staleTime: 5000 // Refresh frequent pour le feed
    });

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Left Sidebar */}
            <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col shrink-0">
                {/* Logo Area */}
                <div className="h-16 flex items-center px-6 border-b border-border">
                    <div className="flex items-center gap-2 font-bold text-lg tracking-wide text-primary">
                        <ShieldAlert className="w-6 h-6" />
                        <span>OSINT-SCOUT</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-4 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-primary/10 text-primary border border-primary/20"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer User */}
                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground">
                            JD
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">Analyste SOC</p>
                            <p className="text-xs text-muted-foreground truncate">john.doe@soc.bj</p>
                        </div>
                        <button className="text-muted-foreground hover:text-destructive transition-colors">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Topbar */}
                <header className="h-16 border-b border-border bg-card/50 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="font-bold text-[11px] uppercase tracking-widest text-muted-foreground/80">System Healthy</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search IP, Domain, or Hash..."
                                className="h-9 w-80 rounded-lg border border-input bg-card pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 transition-all font-mono text-xs"
                            />
                        </div>
                        <div className="h-4 w-px bg-border mx-2"></div>
                        <button className="relative w-9 h-9 flex items-center justify-center rounded-md hover:text-foreground transition-colors text-muted-foreground">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background animate-pulse"></span>
                        </button>
                        <div className="h-8 w-8 rounded-full bg-muted border border-border overflow-hidden">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </header>

                {/* Scrollable Page Content */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    <Outlet />
                </main>
            </div>

            {/* Right Sidebar (Live Feed) */}
            <LiveFeedSidebar alerts={alerts} />
        </div>
    );
}
