import { Link, useLocation } from 'react-router-dom';
import { BellDot, Menu, ShieldCheck } from 'lucide-react';

import { useAuthStore } from '@/store/auth-store';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface TopbarProps {
  onMenuToggle: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Tableau de bord national',
  '/admin/signalements': 'Signalements citoyens',
  '/admin/dossiers': 'Dossiers probatoires',
  '/admin/pme': 'Gestion des PME',
  '/admin/transmissions': 'Transmissions externes',
  '/admin/exports': 'Exports',
  '/dashboard': 'Tableau de bord national',
  '/incidents-signales': 'Signalements citoyens',
  '/reports': 'Dossiers probatoires',
};

export function Topbar({ onMenuToggle }: TopbarProps) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  const matchedPath = Object.keys(PAGE_TITLES).find((path) => location.pathname.startsWith(path));
  const title = matchedPath ? PAGE_TITLES[matchedPath] : 'Console administrateur';

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Ouvrir la navigation"
            onClick={onMenuToggle}
            className="inline-flex rounded-lg border border-input bg-card/60 p-2 text-muted-foreground transition hover:text-foreground md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="brand-mark-frame hidden h-10 w-10 rounded-xl p-1 sm:block">
            <img
              src="/logo-bcs.png"
              alt="BENIN CYBER SHIELD"
              className="h-full w-full rounded-[0.7rem] object-cover"
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-primary/90">Admin Workspace</p>
            <h1 className="font-display text-base font-semibold leading-tight sm:text-lg">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle compact className="sm:w-auto sm:justify-start sm:px-2" />
          <Link
            to="/verify"
            className="hidden rounded-lg border border-primary/30 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/25 sm:inline-flex"
          >
            Verifier un message
          </Link>
          <div className="hidden items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300 sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Systeme operationnel
          </div>
          <button
            aria-label="Notifications"
            className="inline-flex rounded-lg border border-input bg-card/60 p-2 text-muted-foreground transition hover:text-foreground"
          >
            <BellDot className="h-4 w-4" />
          </button>
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium leading-none">{user?.email || 'Administrateur'}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">Session securisee</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/35 bg-primary/15 text-xs font-semibold text-primary">
            {user?.email?.[0]?.toUpperCase() || 'D'}
          </div>
        </div>
      </div>
    </header>
  );
}
