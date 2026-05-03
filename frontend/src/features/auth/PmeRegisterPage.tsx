import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { Building2, Loader2 } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { BrandLockup } from '@/components/brand/BrandLockup';
import { useToast } from '@/components/ui/use-toast';
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

function splitList(value: string): string[] {
  return value
    .split(/[\n,;]/g)
    .map((item) => item.trim())
    .filter(Boolean);
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
    <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="panel overflow-hidden border-primary/20 p-0">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_45%)] px-6 py-8 sm:px-8">
              <BrandLockup
                compact
                subtitle="Plateforme de veille et de signalement"
                className="w-fit rounded-2xl border border-primary/20 bg-card/45 px-3 py-2 backdrop-blur-sm"
                markClassName="h-10 w-10 rounded-xl p-1"
                titleClassName="text-[11px]"
              />
              <div className="space-y-3">
                <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Inscription PME</h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Enregistrez votre entreprise pour recevoir les alertes d'usurpation, suivre les signalements qui vous
                  concernent et telecharger les dossiers probatoires prepares par la plateforme.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Etape 1</p>
                  <p className="mt-2 text-sm font-semibold">Depot du dossier PME</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Etape 2</p>
                  <p className="mt-2 text-sm font-semibold">Validation obligatoire par admin</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Etape 3</p>
                  <p className="mt-2 text-sm font-semibold">Acces aux alertes et dossiers</p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {registered ? (
                <div className="flex h-full flex-col justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/15 text-emerald-300">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-semibold">Demande en attente</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    <span className="font-medium text-foreground">{registered.official_name}</span> a ete enregistre. Le
                    compte <span className="font-medium text-foreground">{registered.email}</span> restera bloque jusqu'a
                    validation par un administrateur.
                  </p>
                  <div className="mt-5 rounded-xl border border-border/70 bg-background/70 p-4 text-sm">
                    <p>
                      <span className="text-muted-foreground">Statut:</span> {registered.validation_status}
                    </p>
                    <p className="mt-2">
                      <span className="text-muted-foreground">Date:</span>{' '}
                      {new Date(registered.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      to="/login"
                      className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      Aller a la connexion
                    </Link>
                    <button
                      type="button"
                      onClick={() => setRegistered(null)}
                      className="inline-flex items-center rounded-xl border border-input px-4 py-2 text-sm text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                    >
                      Enregistrer une autre PME
                    </button>
                  </div>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nom officiel</label>
                    <input
                      value={officialName}
                      onChange={(event) => setOfficialName(event.target.value)}
                      required
                      className="h-11 w-full rounded-xl border border-input bg-background/80 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Email du compte</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        className="h-11 w-full rounded-xl border border-input bg-background/80 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Mot de passe</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        minLength={8}
                        className="h-11 w-full rounded-xl border border-input bg-background/80 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Email de contact</label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(event) => setContactEmail(event.target.value)}
                        className="h-11 w-full rounded-xl border border-input bg-background/80 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Telephone de contact</label>
                      <input
                        value={contactPhone}
                        onChange={(event) => setContactPhone(event.target.value)}
                        placeholder="+229..."
                        className="h-11 w-full rounded-xl border border-input bg-background/80 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Mots-cles d'identification</label>
                    <textarea
                      value={keywords}
                      onChange={(event) => setKeywords(event.target.value)}
                      rows={4}
                      placeholder="Un mot-cle par ligne ou separe par des virgules"
                      className="w-full rounded-xl border border-input bg-background/80 px-3 py-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Numeros legitimes</label>
                    <textarea
                      value={legitNumbers}
                      onChange={(event) => setLegitNumbers(event.target.value)}
                      rows={4}
                      placeholder="+229XXXXXXXX, +229YYYYYYYY"
                      className="w-full rounded-xl border border-input bg-background/80 px-3 py-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <Link to="/login" className="text-sm text-muted-foreground transition hover:text-foreground">
                      J'ai deja un compte
                    </Link>
                    <button
                      type="submit"
                      disabled={registerMutation.isPending}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    >
                      {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Envoyer la demande
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
