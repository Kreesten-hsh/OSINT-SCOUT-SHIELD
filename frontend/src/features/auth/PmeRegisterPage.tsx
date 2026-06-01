import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileCheck2,
  Hash,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Tags,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { BrandLockup } from '@/components/brand/BrandLockup';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { PmeRegistrationData } from '@/types';

interface RegisterPayload {
  email: string;
  password: string;
  official_name: string;
  keywords: string[];
  legit_numbers: string[];
  contact_email?: string;
  contact_phone?: string;
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: LucideIcon;
  helper?: string;
  placeholder?: string;
  type?: 'email' | 'password' | 'tel' | 'text';
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}

interface TextAreaFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: LucideIcon;
  helper: string;
  placeholder: string;
}

function splitList(value: string): string[] {
  return value
    .split(/[\n,;]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function TextField({
  id,
  label,
  value,
  onChange,
  icon: Icon,
  helper,
  placeholder,
  type = 'text',
  required = false,
  minLength,
  autoComplete,
}: TextFieldProps) {
  const helperId = `${id}-helper`;

  return (
    <label htmlFor={id} className="block space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-describedby={helper ? helperId : undefined}
          className="h-12 w-full rounded-2xl border border-input bg-background/80 pl-10 pr-3 text-sm text-foreground outline-none ring-offset-background transition focus:border-primary/60 focus:ring-2 focus:ring-ring/70"
        />
      </span>
      {helper ? <span id={helperId} className="block text-xs leading-5 text-muted-foreground">{helper}</span> : null}
    </label>
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
  icon: Icon,
  helper,
  placeholder,
}: TextAreaFieldProps) {
  const helperId = `${id}-helper`;

  return (
    <label htmlFor={id} className="block space-y-2">
      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </span>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        placeholder={placeholder}
        aria-describedby={helperId}
        className="w-full resize-y rounded-2xl border border-input bg-background/80 px-4 py-3 text-sm text-foreground outline-none ring-offset-background transition focus:border-primary/60 focus:ring-2 focus:ring-ring/70"
      />
      <span id={helperId} className="block text-xs leading-5 text-muted-foreground">{helper}</span>
    </label>
  );
}

function SectionTitle({ icon: Icon, label, title }: { icon: LucideIcon; label: string; title: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">{title}</h2>
      </div>
    </div>
  );
}

function SuccessPanel({
  registered,
  onReset,
}: {
  registered: PmeRegistrationData;
  onReset: () => void;
}) {
  return (
    <div className="fade-rise-in rounded-[1.6rem] border border-emerald-500/25 bg-emerald-500/10 p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-400/15 text-emerald-300">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Demande recue</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Validation administrateur requise</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            <span className="font-semibold text-foreground">{registered.official_name}</span> est bien enregistree.
            Le compte <span className="font-semibold text-foreground">{registered.email}</span> restera bloque jusqu a
            validation par un administrateur BCS.
          </p>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
              <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Statut</dt>
              <dd className="mt-2 text-sm font-semibold">{registered.validation_status}</dd>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
              <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Date</dt>
              <dd className="mt-2 text-sm font-semibold">{new Date(registered.created_at).toLocaleString()}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_18px_36px_-24px_hsl(var(--primary))] hover:bg-primary/90 active:scale-[0.98]"
            >
              Aller a la connexion
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-input bg-background/60 px-5 text-sm font-semibold text-muted-foreground hover:bg-secondary/50 hover:text-foreground active:scale-[0.98]"
            >
              Enregistrer une autre PME
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PmeRegisterPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [officialName, setOfficialName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [legitNumbers, setLegitNumbers] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [registered, setRegistered] = useState<PmeRegistrationData | null>(null);

  const registerMutation = useMutation<
    APIResponse<PmeRegistrationData>,
    AxiosError<{ message?: string }>,
    RegisterPayload
  >({
    mutationFn: async (payload) => {
      const response = await apiClient.post<APIResponse<PmeRegistrationData>>('/pme/register', payload);
      return response.data;
    },
    onSuccess: (payload) => {
      if (!payload.success || !payload.data) {
        toast({
          title: 'Inscription impossible',
          description: payload.message || "Le dossier PME n'a pas pu etre enregistre.",
          variant: 'destructive',
        });
        return;
      }
      setRegistered(payload.data);
      toast({
        title: 'Demande envoyee',
        description: "Le compte PME est maintenant en attente de validation par l'administrateur.",
      });
    },
    onError: (error) => {
      toast({
        title: 'Inscription impossible',
        description: error.response?.data?.message || "Le dossier PME n'a pas pu etre enregistre.",
        variant: 'destructive',
      });
    },
  });

  const keywordCount = splitList(keywords).length;
  const legitNumberCount = splitList(legitNumbers).length;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    registerMutation.mutate({
      email,
      password,
      official_name: officialName,
      keywords: splitList(keywords),
      legit_numbers: splitList(legitNumbers),
      contact_email: contactEmail || undefined,
      contact_phone: contactPhone || undefined,
    });
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(13,147,242,0.18),transparent_32%),radial-gradient(circle_at_88%_4%,rgba(16,185,129,0.14),transparent_30%)]" />
      <div className="landing-grid-overlay opacity-60" aria-hidden="true" />

      <header className="relative z-10 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-[1.35rem] border border-border/70 bg-card/80 px-4 py-3 shadow-[0_22px_48px_-36px_rgba(2,8,23,0.72)] backdrop-blur-xl sm:px-5">
          <Link to="/" aria-label="Accueil BENIN CYBER SHIELD">
            <BrandLockup compact subtitle="Inscription PME" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <Link
              to="/login"
              className="hidden min-h-[40px] items-center justify-center rounded-2xl border border-input bg-background/55 px-4 text-sm font-semibold text-muted-foreground hover:bg-secondary/50 hover:text-foreground active:scale-[0.98] sm:inline-flex"
            >
              Connexion
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="panel overflow-hidden p-0">
          <div className="border-b border-border/70 bg-secondary/25 px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <SectionTitle icon={FileCheck2} label="Inscription PME" title="Dossier d'inscription" />
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <div className="rounded-2xl border border-border/70 bg-background/55 px-4 py-3">
                  <p className="font-mono text-lg font-semibold">{keywordCount}</p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">mots-cles</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/55 px-4 py-3">
                  <p className="font-mono text-lg font-semibold">{legitNumberCount}</p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">numeros</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {registered ? (
              <SuccessPanel registered={registered} onReset={() => setRegistered(null)} />
            ) : (
              <form className="space-y-8" onSubmit={handleSubmit}>
                <section className="space-y-5">
                  <SectionTitle icon={Building2} label="Identite" title="Compte et informations officielles" />
                  <div className="grid gap-4">
                    <TextField
                      id="official-name"
                      label="Nom officiel de la PME"
                      value={officialName}
                      onChange={setOfficialName}
                      icon={Building2}
                      required
                      autoComplete="organization"
                      placeholder="Ex: Orabank Benin, Boutique Fifame, BCS Market"
                      helper="Utilisez le nom que vos clients reconnaissent dans les messages ou les recus."
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextField
                        id="account-email"
                        label="Email du compte PME"
                        value={email}
                        onChange={setEmail}
                        icon={Mail}
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="contact@entreprise.bj"
                        helper="Cet email servira a la connexion apres validation."
                      />
                      <TextField
                        id="account-password"
                        label="Mot de passe"
                        value={password}
                        onChange={setPassword}
                        icon={LockKeyhole}
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="Minimum 8 caracteres"
                        helper="Choisissez un mot de passe reserve a ce compte."
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-5">
                  <SectionTitle icon={Tags} label="Detection" title="Elements utilises pour reconnaitre l'usurpation" />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <TextAreaField
                      id="keywords"
                      label="Mots-cles d'identification"
                      value={keywords}
                      onChange={setKeywords}
                      icon={Tags}
                      placeholder="Nom commercial, sigle, quartier, service, marque..."
                      helper="Un element par ligne, ou separe par une virgule. Ces termes aident BCS a rapprocher les signalements de votre PME."
                    />
                    <TextAreaField
                      id="legit-numbers"
                      label="Numeros legitimes"
                      value={legitNumbers}
                      onChange={setLegitNumbers}
                      icon={Hash}
                      placeholder={"+229XXXXXXXX\n+229YYYYYYYY"}
                      helper="Ajoutez les numeros officiels utilises par l'entreprise. Ils aident a distinguer un vrai contact d'un imposteur."
                    />
                  </div>
                </section>

                <section className="space-y-5">
                  <SectionTitle icon={Phone} label="Contact" title="Coordonnees de suivi" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      id="contact-email"
                      label="Email de contact"
                      value={contactEmail}
                      onChange={setContactEmail}
                      icon={Mail}
                      type="email"
                      autoComplete="email"
                      placeholder="direction@entreprise.bj"
                      helper="Facultatif, utile pour les demandes de precision."
                    />
                    <TextField
                      id="contact-phone"
                      label="Telephone de contact"
                      value={contactPhone}
                      onChange={setContactPhone}
                      icon={Phone}
                      type="tel"
                      autoComplete="tel"
                      placeholder="+229..."
                      helper="Facultatif, visible uniquement pour le suivi administratif."
                    />
                  </div>
                </section>

                <div className={cn(
                  'rounded-[1.4rem] border border-border/70 bg-background/50 p-4',
                  registerMutation.isPending && 'animate-pulse',
                )}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                        <ShieldCheck className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">Validation avant activation</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          La creation du compte ne donne pas encore acces au tableau de bord. Un administrateur doit
                          approuver la fiche PME.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Link
                        to="/login"
                        className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-input bg-background/60 px-5 text-sm font-semibold text-muted-foreground hover:bg-secondary/50 hover:text-foreground active:scale-[0.98]"
                      >
                        J'ai deja un compte
                      </Link>
                      <button
                        type="submit"
                        disabled={registerMutation.isPending}
                        className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_18px_36px_-24px_hsl(var(--primary))] hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        {registerMutation.isPending ? 'Envoi en cours...' : 'Envoyer la demande'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
