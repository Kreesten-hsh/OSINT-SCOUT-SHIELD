import { NavLink } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, FileText, Settings, Shield, LogOut, PlusCircle, BrainCircuit, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

const navItems = [
    { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { to: '/alerts', label: 'Gestion des Alertes', icon: AlertTriangle },
    { to: '/analyse', label: "Centre d'Analyse", icon: BrainCircuit },
    { to: '/evidence', label: 'Preuves & Archives', icon: Shield },
    { to: '/reports', label: 'Rapports', icon: FileText },
    { to: '/monitoring', label: 'Surveillance Auto', icon: Globe },
    { to: '/ingestion', label: 'Nouveau Ciblage', icon: PlusCircle },
    { to: '/settings', label: 'ParamÃ¨tres', icon: Settings },
];

export function Sidebar() {
    const logout = useAuthStore((state) => state.logout);

    return (
        <aside className="w-64 bg-card border-r border-border h-screen flex flex-col fixed left-0 top-0 z-40 transition-transform">
            <div className="h-16 flex items-center px-6 border-b border-border bg-card/50 backdrop-blur-xl">
                <Shield className="w-6 h-6 text-primary mr-3" />
                <span className="font-bold text-lg tracking-tight">OSINT-SCOUT</span>
            </div>

            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                            )
                        }
                    >
                        <item.icon className="w-5 h-5 mr-3" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-border">
                <button
                    onClick={logout}
                    className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    DÃ©connexion
                </button>
            </div>
        </aside>
    );
}

