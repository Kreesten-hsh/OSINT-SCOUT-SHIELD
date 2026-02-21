import { Menu, ShieldCheck } from 'lucide-react';

import { useAuthStore } from '@/store/auth-store';

interface BusinessTopbarProps {
  onMenuToggle: () => void;
}

export function BusinessTopbar({ onMenuToggle }: BusinessTopbarProps) {
  const user = useAuthStore((state) => state.user);

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
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-primary/90">Business Workspace</p>
            <h1 className="font-display text-base font-semibold leading-tight sm:text-lg">Espace PME</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300 sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Session PME active
          </div>
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium leading-none">{user?.email || 'Compte PME'}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">Acces securise</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/35 bg-primary/15 text-xs font-semibold text-primary">
            {user?.email?.[0]?.toUpperCase() || 'P'}
          </div>
        </div>
      </div>
    </header>
  );
}

