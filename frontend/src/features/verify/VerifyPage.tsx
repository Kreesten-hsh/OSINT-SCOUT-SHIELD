import { Download, Home, LockKeyhole, MessageSquareText, Radar, ShieldCheck, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

import { BrandLockup } from '@/components/brand/BrandLockup';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import VerifySignalPanel from '@/features/verify/VerifySignalPanel';

const APK_DOWNLOAD_URL = '/downloads/benin-cyber-shield.apk';

const FLOW_STEPS = [
  {
    label: 'Message',
    detail: 'SMS, WhatsApp ou lien suspect',
    Icon: MessageSquareText,
  },
  {
    label: 'Analyse',
    detail: 'Score, regles et signaux detectes',
    Icon: Radar,
  },
  {
    label: 'Signalement',
    detail: 'Reference publique et preuve',
    Icon: ShieldCheck,
  },
];

export default function VerifyPage() {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
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

        <section className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-[0_24px_80px_-58px_rgba(15,23,42,0.72)] backdrop-blur-xl sm:p-7 lg:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase text-primary">
              <LockKeyhole className="h-3.5 w-3.5" />
              Verification citoyenne
            </div>
            <h1 className="mt-5 max-w-3xl font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Verifier un message suspect avant de cliquer.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Collez un SMS, un message de messagerie mobile ou un lien de phishing. BCS analyse le contenu, estime le risque
              et vous guide vers le bon geste.
            </p>
          </div>

          <aside className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.68)] backdrop-blur-xl">
            <p className="text-xs font-bold uppercase text-muted-foreground">Chaine de traitement</p>
            <div className="mt-4 space-y-3">
              {FLOW_STEPS.map(({ label, detail, Icon }, index) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                      <p className="font-semibold text-foreground">{label}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Mode soutenance pret</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Les resultats restent lisibles en mode clair pour les captures et l'impression du memoire.
              </p>
            </div>
          </aside>
        </section>

        <VerifySignalPanel />
      </div>
    </main>
  );
}
