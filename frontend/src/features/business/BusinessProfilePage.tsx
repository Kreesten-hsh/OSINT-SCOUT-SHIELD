import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { Loader2, Save } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import type { PmeProfileData } from '@/types';

function joinLines(values: string[]): string {
  return values.join('\n');
}

function splitLines(value: string): string[] {
  return value
    .split(/[\n,;]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function validationVariant(status: PmeProfileData['validation_status']): 'outline' | 'success' | 'destructive' | 'secondary' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'REJECTED') return 'destructive';
  if (status === 'DISABLED') return 'secondary';
  return 'outline';
}

export default function BusinessProfilePage() {
  const { toast } = useToast();
  const [officialName, setOfficialName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [legitNumbers, setLegitNumbers] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pme-profile'],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<PmeProfileData>>('/pme/profile');
      return response.data.data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setOfficialName(data.official_name);
    setKeywords(joinLines(data.keywords));
    setLegitNumbers(joinLines(data.legit_numbers));
    setContactEmail(data.contact_email || '');
    setContactPhone(data.contact_phone || '');
  }, [data]);

  const updateMutation = useMutation<
    APIResponse<PmeProfileData>,
    AxiosError<{ message?: string }>,
    Record<string, unknown>
  >({
    mutationFn: async (payload) => {
      const response = await apiClient.patch<APIResponse<PmeProfileData>>('/pme/profile', payload);
      return response.data;
    },
    onSuccess: (payload) => {
      if (!payload.success || !payload.data) {
        toast({
          title: 'Mise a jour impossible',
          description: payload.message || "Le profil PME n'a pas pu etre mis a jour.",
          variant: 'destructive',
        });
        return;
      }
      refetch();
      toast({
        title: 'Profil mis a jour',
        description: 'Les informations PME ont ete enregistrees.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Mise a jour impossible',
        description: error.response?.data?.message || "Le profil PME n'a pas pu etre mis a jour.",
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <section className="panel flex min-h-56 items-center justify-center text-muted-foreground fade-rise-in">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement du profil PME...
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="panel border-destructive/25 bg-destructive/10 p-8 text-center fade-rise-in">
        <p className="text-sm font-semibold text-destructive">Impossible de charger le profil PME.</p>
        <button onClick={() => refetch()} className="mt-3 rounded-lg border border-destructive/30 px-3 py-2 text-xs text-destructive">
          Reessayer
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="panel p-5 fade-rise-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title text-2xl">Profil PME</h2>
            <p className="section-subtitle">Informations d'identification utilisees pour detecter les usurpations.</p>
          </div>
          <Badge variant={validationVariant(data.validation_status)}>{data.validation_status}</Badge>
        </div>
      </section>

      <section className="panel p-5 fade-rise-in-1">
        <div className="mb-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Compte</p>
            <p className="mt-2 text-sm font-semibold">{data.user_email}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Validation</p>
            <p className="mt-2 text-sm font-semibold">
              {data.validated_at ? new Date(data.validated_at).toLocaleString() : 'En attente / non renseigne'}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Creation</p>
            <p className="mt-2 text-sm font-semibold">{new Date(data.created_at).toLocaleString()}</p>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            updateMutation.mutate({
              official_name: officialName,
              keywords: splitLines(keywords),
              legit_numbers: splitLines(legitNumbers),
              contact_email: contactEmail || null,
              contact_phone: contactPhone || null,
            });
          }}
        >
          <div className="space-y-1">
            <label className="text-sm font-medium">Nom officiel</label>
            <input
              value={officialName}
              onChange={(event) => setOfficialName(event.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background/80 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
            />
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
                className="h-11 w-full rounded-xl border border-input bg-background/80 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Mots-cles</label>
            <textarea
              rows={4}
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              className="w-full rounded-xl border border-input bg-background/80 px-3 py-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Numeros legitimes</label>
            <textarea
              rows={4}
              value={legitNumbers}
              onChange={(event) => setLegitNumbers(event.target.value)}
              className="w-full rounded-xl border border-input bg-background/80 px-3 py-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
