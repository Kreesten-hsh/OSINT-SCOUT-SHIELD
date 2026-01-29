import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Bell,
    Settings,
    LogOut,
    Shield,
    Menu,
    FileText,
    Search,
    Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const logout = useAuthStore((state) => state.logout);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const menuItems = [
        { label: 'Vue Globale', icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Alertes de Sécurité', icon: Bell, path: '/alerts' },
        { label: 'Investigations', icon: Search, path: '/investigations' }, // Placeholder based on general knowledge
        { label: 'Rapports', icon: FileText, path: '/reports' }, // Placeholder
        { label: 'Sources', icon: Database, path: '/sources' }, // Placeholder
        { label: 'Administration', icon: Settings, path: '/settings' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#0B0F14] text-slate-100 flex font-sans">
            {/* Sidebar */}
            <aside
                className={cn(
                    "bg-[#131B24] border-r border-[#1E293B] flex-col transition-all duration-300 fixed h-full z-20 left-0 top-0",
                    isSidebarOpen ? "w-64" : "w-16"
                )}
            >
                <div className="h-16 flex items-center px-4 border-b border-[#1E293B]">
                    <Shield className="h-8 w-8 text-blue-500 shrink-0" />
                    <span className={cn("ml-3 font-bold text-lg tracking-wider transition-opacity duration-300",
                        !isSidebarOpen && "opacity-0 hidden"
                    )}>
                        OSINT-SCOUT
                    </span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {menuItems.map((item) => (
                        <Button
                            key={item.path}
                            variant="ghost"
                            className={cn(
                                "w-full justify-start text-slate-400 hover:text-white hover:bg-white/5",
                                location.pathname === item.path && "bg-blue-600/10 text-blue-400 border-r-2 border-blue-500 rounded-none",
                                !isSidebarOpen && "justify-center px-2"
                            )}
                            onClick={() => navigate(item.path)}
                        >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {isSidebarOpen && <span className="ml-3 truncate">{item.label}</span>}
                        </Button>
                    ))}
                </nav>

                <div className="p-4 border-t border-[#1E293B]">
                    <Button
                        variant="ghost"
                        className={cn("w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/10", !isSidebarOpen && "justify-center px-2")}
                        onClick={handleLogout}
                    >
                        <LogOut className="h-5 w-5 shrink-0" />
                        {isSidebarOpen && <span className="ml-3">Déconnexion</span>}
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={cn(
                "flex-1 flex flex-col min-h-screen transition-all duration-300",
                isSidebarOpen ? "ml-64" : "ml-16"
            )}>
                {/* Topbar */}
                <header className="h-16 bg-[#0B0F14]/80 backdrop-blur-sm border-b border-[#1E293B] sticky top-0 z-10 flex items-center justify-between px-6">
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <Menu className="h-5 w-5 text-slate-400" />
                    </Button>

                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                        </Button>
                        <div className="flex items-center gap-3 pl-4 border-l border-[#1E293B]">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-white">Agent Command</p>
                                <p className="text-xs text-slate-500">Cotonou HQ</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                                AC
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6 fade-in">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
