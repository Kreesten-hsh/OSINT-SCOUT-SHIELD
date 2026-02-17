import { Bell, Search, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export function Topbar() {
    const user = useAuthStore((state) => state.user);

    return (
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6 sticky top-0 z-30 ml-64">
            <div className="flex items-center flex-1 max-w-xl">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Rechercher une alerte, une IP, un domaine..."
                        className="w-full bg-secondary/50 border border-input rounded-md py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-ring focus:border-input outline-none transition-all placeholder:text-muted-foreground/60"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4 ml-6">
                <button className="relative p-2 rounded-full hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background" />
                </button>

                <div className="h-8 w-px bg-border mx-2" />

                <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium leading-none">{user?.email || 'Analyste'}</p>
                        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{user?.role || 'SOC_ANALYST'}</p>
                    </div>
                    <div className="h-9 w-9 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold ring-2 ring-background border border-primary/30">
                        {user?.email?.[0].toUpperCase() || <User className="w-5 h-5" />}
                    </div>
                </div>
            </div>
        </header>
    );
}
