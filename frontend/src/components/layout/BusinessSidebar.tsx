import { NavLink } from 'react-router-dom';
import { AlertTriangle, FileText, FolderKanban, LogOut, ShieldCheck, UserCircle2, X } from 'lucide-react';

import { BrandLockup } from '@/components/brand/BrandLockup';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

interface BusinessSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const businessNavItems = [
  { to: '/pme/dashboard', label: 'Tableau de bord', icon: ShieldCheck },
  { to: '/pme/alertes', label: 'Mes alertes', icon: AlertTriangle },
  { to: '/pme/signalements', label: 'Signalements lies', icon: FolderKanban },
  { to: '/pme/dossiers', label: 'Mes dossiers', icon: FileText },
  { to: '/pme/profil', label: 'Mon profil', icon: UserCircle2 },
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
            <BrandLockup compact subtitle="Espace PME" />
            <Badge variant="outline" className="h-5 border-primary/30 bg-primary/10 text-[10px] uppercase text-primary">
              PME
            </Badge>
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
