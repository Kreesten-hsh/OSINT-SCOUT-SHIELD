import { NavLink } from 'react-router-dom';
import { AlertTriangle, FileText, Globe, LogOut, ShieldCheck, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

interface BusinessSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const businessNavItems = [
  { to: '/business/verify', label: 'Vérification', icon: ShieldCheck },
  { to: '/business/monitoring', label: 'Surveillance', icon: Globe },
  { to: '/business/alerts', label: 'Mes alertes', icon: AlertTriangle },
  { to: '/business/reports', label: 'Mes rapports', icon: FileText },
];

export function BusinessSidebar({ mobileOpen, onClose }: BusinessSidebarProps) {
  const logout = useAuthStore((state) => state.logout);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-border/80 bg-card/95 backdrop-blur-xl transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border/70 px-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-primary/30 bg-primary/15 p-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold uppercase tracking-wide text-primary/90">
                BENIN CYBER SHIELD
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Business Console</p>
                <Badge variant="outline" className="h-5 border-primary/30 bg-primary/10 text-[10px] uppercase text-primary">
                  PME
                </Badge>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex rounded-md p-1 text-muted-foreground hover:bg-secondary/50 hover:text-foreground md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {businessNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'border border-primary/30 bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border/70 p-3">
          <button
            onClick={logout}
            className="inline-flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Deconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
