import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  Fingerprint,
  LockKeyhole,
  MessageSquareWarning,
  Radar,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { BrandLockup } from '@/components/brand/BrandLockup';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useAuthStore } from '@/store/auth-store';

const APK_DOWNLOAD_URL = '/downloads/benin-cyber-shield.apk';

const platformHighlights = [
  'Analyse des messages suspects',
  'Signalement formel avec pieces',
  'Detection d usurpation PME',
  'Dossiers forensiques exportables',
] as const;

const audienceCards = [
  {
    icon: MessageSquareWarning,
    title: 'Citoyens',
    description: 'Verifier un SMS, un lien ou un numero suspect avant de repondre, cliquer ou payer.',
  },
  {
    icon: Building2,
    title: 'PME',
    description: 'Surveiller les alertes liees a la marque, suivre les cas et conserver les preuves.',
  },
  {
    icon: ShieldCheck,
    title: 'Cellules cyber',
    description: 'Relier signalements, indicateurs, dossiers et transmissions dans une chaine lisible.',
  },
] as const;

const signalRows = [
  { label: 'MoMo bonus fraud', status: 'Score 91', tone: 'text-red-200' },
  { label: 'Fake PME page', status: '3 preuves', tone: 'text-amber-200' },
  { label: 'Citizen report', status: 'Recu', tone: 'text-emerald-200' },
] as const;

const trustMetrics = [
  { value: '24/7', label: 'veille mobile' },
  { value: 'SHA-256', label: 'empreintes probatoires' },
  { value: 'API', label: 'transmissions controlees' },
] as const;

function DashboardLink() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <Link
        to="/login"
        className="nav-cta hidden min-h-[42px] items-center justify-center gap-2 px-4 text-sm font-semibold sm:inline-flex"
      >
        <LockKeyhole className="h-4 w-4" />
        Connexion PME
      </Link>
    );
  }

  const dashboardPath = user?.role === 'SME' ? '/pme/dashboard' : '/admin/dashboard';
  return (
    <Link
      to={dashboardPath}
      className="nav-cta hidden min-h-[42px] items-center justify-center gap-2 px-4 text-sm font-semibold sm:inline-flex"
    >
      <BarChart3 className="h-4 w-4" />
      Tableau de bord
    </Link>
  );
}

function DefenseOrb() {
  return (
    <div className="defense-orbit-scene" aria-hidden="true">
      <div className="defense-orbit defense-orbit-a" />
      <div className="defense-orbit defense-orbit-b" />
      <div className="defense-orbit defense-orbit-c" />
      <div className="shield-core">
        <ShieldCheck className="h-14 w-14 text-sky-100" strokeWidth={1.5} />
      </div>
      <span className="orbit-node orbit-node-a" />
      <span className="orbit-node orbit-node-b" />
      <span className="orbit-node orbit-node-c" />
    </div>
  );
}

function IntelligencePreview() {
  return (
    <div className="landing-glass hero-console">
      <div className="hero-console-topline">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-sky-300/20 bg-sky-300/10 text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
            <Radar className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-50">Signal intake</p>
            <p className="text-xs text-slate-400">Cotonou, Abomey-Calavi, Parakou</p>
          </div>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          Live
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="landing-glass-subtle p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Message suspect</p>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            Vous avez gagne 250000 FCFA. Cliquez vite sur mtn-bonus-client.com et saisissez votre PIN MoMo.
          </p>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-4xl font-semibold text-red-200">91</p>
              <p className="text-xs text-slate-500">score de risque</p>
            </div>
            <div className="rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-right">
              <p className="text-xs text-red-100/70">classification</p>
              <p className="text-sm font-bold text-red-100">Phishing mobile</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {signalRows.map((row, index) => (
            <div
              key={row.label}
              className="signal-strip"
              style={{ '--signal-delay': `${index * 90}ms` } as CSSProperties}
            >
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.72)]" />
                <span className="text-sm text-slate-200">{row.label}</span>
              </div>
              <span className={`font-mono text-xs font-semibold ${row.tone}`}>{row.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeviceStack() {
  return (
    <div className="device-stage" aria-hidden="true">
      <div className="device-card device-card-back">
        <div className="h-3 w-24 rounded-full bg-sky-300/20" />
        <div className="mt-8 space-y-3">
          <span className="block h-3 w-32 rounded-full bg-slate-200/20" />
          <span className="block h-3 w-44 rounded-full bg-slate-200/10" />
          <span className="block h-3 w-28 rounded-full bg-emerald-200/20" />
        </div>
      </div>
      <div className="device-card device-card-front">
        <div className="mx-auto h-1.5 w-16 rounded-full bg-slate-800/20" />
        <div className="mt-6 rounded-2xl border border-sky-300/20 bg-sky-300/10 p-4">
          <Smartphone className="h-5 w-5 text-sky-100" />
          <p className="mt-4 text-sm font-semibold text-white">Notification analysee</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">WhatsApp, SMS et Messenger avec consentement utilisateur.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="rounded-xl bg-emerald-300/10 p-3 text-xs text-emerald-100">autorise</span>
          <span className="rounded-xl bg-red-300/10 p-3 text-xs text-red-100">suspect</span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      <header className="fixed left-0 right-0 top-0 z-40 px-3 pt-3 sm:px-6">
        <div className="landing-nav mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
          <Link to="/" aria-label="Accueil BENIN CYBER SHIELD">
            <BrandLockup compact subtitle="Protection cyber mobile" />
          </Link>
          <nav className="nav-links hidden items-center gap-1 text-sm font-semibold md:flex">
            <a href="#solution">Solution</a>
            <a href="#pme">PME</a>
            <a href="#mobile">Android</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <DashboardLink />
          </div>
        </div>
      </header>

      <section className="landing-hero relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-24">
        <div className="landing-mesh" aria-hidden="true" />
        <div className="landing-grid-overlay" aria-hidden="true" />
        <div className="particle-field" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[0.9fr_1.1fr] xl:gap-20">
          <div className="fade-rise-in max-w-3xl py-10 lg:py-16">
            <div className="hero-kicker inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]">
              <BadgeCheck className="h-4 w-4" />
              Plateforme beninoise anti-cyberfraude
            </div>
            <h1 className="mt-8 max-w-5xl font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-7xl">
              La confiance numerique, visible en temps reel.
            </h1>
            <p className="mt-7 max-w-2xl text-base text-muted-foreground sm:text-lg">
              BENIN CYBER SHIELD transforme les signalements mobiles, les alertes PME et les preuves techniques en une chaine de defense claire, rapide et exploitable.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/verify"
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_18px_38px_-24px_hsl(var(--primary))] hover:-translate-y-0.5 hover:bg-primary/90 active:scale-[0.98]"
              >
                Verifier un message
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/pme/register"
                className="liquid-button inline-flex min-h-[50px] items-center justify-center gap-2 px-5 text-sm font-bold text-foreground active:scale-[0.98]"
              >
                Inscrire ma PME
              </Link>
              <a
                href={APK_DOWNLOAD_URL}
                download
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-5 text-sm font-bold text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] hover:-translate-y-0.5 hover:bg-emerald-300/15 active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                APK Android
              </a>
            </div>
            <div className="mt-12 grid max-w-2xl gap-3 sm:grid-cols-3">
              {trustMetrics.map((metric) => (
                <div key={metric.label} className="landing-glass-subtle px-4 py-3">
                  <p className="font-mono text-xl font-semibold text-foreground">{metric.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[560px] lg:min-h-[660px]">
            <DefenseOrb />
            <div className="absolute bottom-4 left-0 right-0 mx-auto w-full max-w-xl lg:bottom-12">
              <IntelligencePreview />
            </div>
          </div>
        </div>
      </section>

      <section id="solution" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Une plateforme, trois usages</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Du premier doute au dossier exploitable.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {audienceCards.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="landing-glass group p-5"
                  style={{ '--signal-delay': `${index * 70}ms` } as CSSProperties}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition-transform duration-200 ease-out group-hover:scale-[1.04]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-bold tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pme" className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="landing-glass p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Espace PME</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Detection d usurpation, suivi des alertes, preuves propres.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Les PME declarent leurs informations officielles, suivent les alertes liees a leur marque et telechargent les dossiers lorsque les preuves sont consolidees.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/pme/register"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
            >
              Creer un profil PME
            </Link>
            <Link
              to="/login"
              className="liquid-button inline-flex min-h-[46px] items-center justify-center gap-2 px-4 text-sm font-bold text-foreground active:scale-[0.98]"
            >
              Se connecter
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {platformHighlights.map((item) => (
            <div key={item} className="landing-glass-subtle flex items-start gap-3 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <p className="text-sm font-bold">{item}</p>
            </div>
          ))}
          <div className="landing-glass-subtle p-5 sm:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">chaine de preuve</p>
                <p className="mt-2 font-display text-2xl font-bold">Capture, hash, rapport, transmission.</p>
              </div>
              <Fingerprint className="h-10 w-10 text-sky-300" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </section>

      <section id="mobile" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="landing-glass relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.88fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">
                <Smartphone className="h-4 w-4" />
                Application Android
              </div>
              <h2 className="mt-5 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Une couche mobile pour capter les signaux avant la fraude.
              </h2>
              <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
                L application Android surveille les notifications autorisees par l utilisateur, classe les messages suspects et garde l experience lisible sur le terrain.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href={APK_DOWNLOAD_URL}
                  download
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-foreground px-5 text-sm font-bold text-background hover:opacity-90 active:scale-[0.98]"
                >
                  <Download className="h-4 w-4" />
                  Telecharger l APK
                </a>
                <Link
                  to="/verify"
                  className="liquid-button inline-flex min-h-[48px] items-center justify-center gap-2 px-5 text-sm font-bold text-foreground active:scale-[0.98]"
                >
                  Tester le portail
                </Link>
              </div>
            </div>
            <DeviceStack />
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <BrandLockup compact subtitle="BENIN CYBER SHIELD" />
          <div className="flex flex-wrap gap-4">
            <Link to="/verify" className="hover:text-foreground">Verification</Link>
            <Link to="/pme/register" className="hover:text-foreground">Inscription PME</Link>
            <Link to="/login" className="hover:text-foreground">Connexion</Link>
          </div>
          <div className="inline-flex items-center gap-2">
            <Users className="h-4 w-4" />
            Protection citoyenne et PME
          </div>
        </div>
      </footer>
    </main>
  );
}
