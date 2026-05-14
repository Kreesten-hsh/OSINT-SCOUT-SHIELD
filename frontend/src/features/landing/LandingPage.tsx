import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  FileArchive,
  Globe2,
  LockKeyhole,
  MessageSquareWarning,
  Radar,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { BrandLockup } from '@/components/brand/BrandLockup';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useAuthStore } from '@/store/auth-store';

const APK_DOWNLOAD_URL = '/downloads/benin-cyber-shield.apk';

const audienceCards = [
  {
    icon: MessageSquareWarning,
    title: 'Citoyens',
    description: 'Verification rapide des SMS, liens et numeros suspects avant de repondre ou de payer.',
  },
  {
    icon: Building2,
    title: 'PME',
    description: 'Surveillance des tentatives d’usurpation, dossiers probatoires et suivi des alertes.',
  },
  {
    icon: ShieldCheck,
    title: 'Cellules cyber',
    description: 'Centralisation des signalements, correlation des numeros et transmission des dossiers critiques.',
  },
] as const;

const platformHighlights = [
  'Analyse des messages suspects',
  'Signalement formel avec pieces',
  'Detection d’usurpation PME',
  'Dossiers forensiques exportables',
] as const;

const trustMetrics = [
  { value: '24/7', label: 'surveillance mobile' },
  { value: 'SHA-256', label: 'integrite probatoire' },
  { value: 'API-first', label: 'architecture controlee' },
] as const;

function DashboardLink() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <Link
        to="/login"
        className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-input bg-background/70 px-4 text-sm font-semibold text-foreground hover:bg-secondary/70"
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
      className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-input bg-background/70 px-4 text-sm font-semibold text-foreground hover:bg-secondary/70"
    >
      <BarChart3 className="h-4 w-4" />
      Tableau de bord
    </Link>
  );
}

function ProductPreview() {
  return (
    <div className="relative overflow-hidden rounded-[1.35rem] border border-emerald-500/20 bg-slate-950 p-4 text-slate-100 shadow-2xl shadow-emerald-950/30">
      <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300">
              <Radar className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">Centre de detection BCS</p>
              <p className="text-xs text-slate-400">Signalement citoyen en cours</p>
            </div>
          </div>
          <span className="rounded-full border border-red-400/25 bg-red-400/10 px-3 py-1 text-xs font-bold text-red-200">
            Risque fort
          </span>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase text-slate-400">Message analyse</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            Vous avez gagne 250000 FCFA. Cliquez vite sur mtn-bonus-client.com et saisissez votre PIN MoMo.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-red-400/10 p-3">
              <p className="text-lg font-bold text-red-200">92</p>
              <p className="text-[11px] text-slate-400">score</p>
            </div>
            <div className="rounded-xl bg-amber-400/10 p-3">
              <p className="text-lg font-bold text-amber-200">3</p>
              <p className="text-[11px] text-slate-400">regles</p>
            </div>
            <div className="rounded-xl bg-emerald-400/10 p-3">
              <p className="text-lg font-bold text-emerald-200">1</p>
              <p className="text-[11px] text-slate-400">dossier</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <FileArchive className="h-5 w-5 text-emerald-300" />
            <p className="mt-3 text-sm font-semibold">Dossier forensique</p>
            <p className="mt-1 text-xs text-slate-400">Manifeste, preuves et empreintes d’integrite.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Globe2 className="h-5 w-5 text-sky-300" />
            <p className="mt-3 text-sm font-semibold">Transmission externe</p>
            <p className="mt-1 text-xs text-slate-400">Flux prepares pour autorites et operateurs.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Accueil BENIN CYBER SHIELD">
            <BrandLockup compact subtitle="Protection cyber mobile" />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#solution" className="hover:text-foreground">Solution</a>
            <a href="#pme" className="hover:text-foreground">PME</a>
            <a href="#mobile" className="hover:text-foreground">Android</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DashboardLink />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 soft-grid opacity-60" />
        <div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/12 blur-3xl" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
              <BadgeCheck className="h-4 w-4" />
              Plateforme beninoise anti-cyberfraude
            </div>
            <h1 className="mt-6 max-w-4xl font-display text-4xl font-bold tracking-normal text-foreground sm:text-5xl lg:text-6xl">
              Verifiez les messages suspects. Protegez les PME. Centralisez les preuves.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              BENIN CYBER SHIELD aide le public a analyser les arnaques mobiles, accompagne les PME face a l’usurpation
              et fournit un socle probatoire exploitable par les acteurs cyber.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/verify"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              >
                Verifier un message
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/pme/register"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-input bg-card/80 px-5 text-sm font-bold text-foreground hover:bg-secondary/70"
              >
                Inscrire ma PME
              </Link>
              <a
                href={APK_DOWNLOAD_URL}
                download
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-5 text-sm font-bold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
              >
                <Download className="h-4 w-4" />
                APK Android
              </a>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {trustMetrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-border/80 bg-card/80 px-4 py-3">
                  <p className="font-display text-xl font-bold">{metric.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section id="solution" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Une plateforme, trois usages</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-normal">Du premier doute au dossier exploitable.</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {audienceCards.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="panel p-5">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-display text-xl font-bold tracking-normal">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="pme" className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Espace PME</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-normal">Detection d’usurpation et suivi des incidents.</h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Les PME declarent leurs informations officielles, suivent les alertes liees a leur marque et telechargent les
            dossiers probatoires lorsque les preuves sont constituees.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/pme/register"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              Creer un profil PME
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-input px-4 text-sm font-bold text-foreground hover:bg-secondary/70"
            >
              Se connecter
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {platformHighlights.map((item) => (
            <div key={item} className="rounded-2xl border border-border bg-card/80 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <p className="mt-3 text-sm font-bold">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="mobile" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[1.5rem] border border-emerald-500/20 bg-emerald-950 p-6 text-white shadow-2xl shadow-emerald-950/20 md:p-8">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_0.82fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase text-emerald-100">
                <Smartphone className="h-4 w-4" />
                Application Android
              </div>
              <h2 className="mt-5 font-display text-3xl font-bold tracking-normal">Analyse mobile des notifications suspectes.</h2>
              <p className="mt-3 max-w-2xl text-sm text-emerald-50/80">
                L’application Android surveille les notifications SMS, WhatsApp et Messenger autorisees par l’utilisateur,
                puis envoie les messages suspects au moteur d’analyse BCS.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
              <a
                href={APK_DOWNLOAD_URL}
                download
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-emerald-950 hover:bg-emerald-50"
              >
                <Download className="h-4 w-4" />
                Telecharger l’APK
              </a>
              <Link
                to="/verify"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-bold text-white hover:bg-white/10"
              >
                Tester le portail
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/70 px-4 py-8 sm:px-6 lg:px-8">
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
