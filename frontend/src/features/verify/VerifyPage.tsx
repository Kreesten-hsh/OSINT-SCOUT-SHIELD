import { Download, Home, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

import { BrandLockup } from '@/components/brand/BrandLockup';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import VerifySignalPanel from '@/features/verify/VerifySignalPanel';

const APK_DOWNLOAD_URL = '/downloads/benin-cyber-shield.apk';

export default function VerifyPage() {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/90 px-3 py-3 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.65)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <Link to="/" aria-label="Retour a l'accueil" className="w-fit rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BrandLockup compact subtitle="Portail citoyen" />
          </Link>

          <nav className="flex flex-wrap items-center gap-2" aria-label="Actions du portail citoyen">
            <Link
              to="/"
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-input bg-background/60 px-3 text-sm font-semibold text-foreground hover:bg-secondary/70"
            >
              <Home className="h-4 w-4" />
              Accueil
            </Link>
            <a
              href={APK_DOWNLOAD_URL}
              download
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-emerald-600/25 bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
            >
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">App Android</span>
              <Download className="h-4 w-4" />
            </a>
            <ThemeToggle />
          </nav>
        </header>

        <VerifySignalPanel />
      </div>
    </main>
  );
}
