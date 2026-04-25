import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { ArrowLeft, Building2, CheckCircle2, Loader2, Mail, Phone, ShieldOff, XCircle } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { alertStatusLabel, alertStatusVariant, channelLabel } from '@/lib/presentation';
import type { AdminBusinessDetailData, AdminBusinessListItem } from '@/types';

function statusVariant(status: AdminBusinessDetailData['validation_status']): 'outline' | 'success' | 'destructive' | 'secondary' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'REJECTED') return 'destructive';
  if (status === 'DISABLED') return 'secondary';
  return 'outline';
}

export default function AdminBusinessDetailPage() {
  const { businessUuid } = useParams<{ businessUuid: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-pme-detail', businessUuid],
    enabled: Boolean(businessUuid),
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<AdminBusinessDetailData>>(`/admin/pme/${businessUuid}`);
      return response.data.data;
    },
  });

  const actionMutation = useMutation<
    APIResponse<AdminBusinessListItem>,
    AxiosError<{ message?: string }>,
    'approve' | 'reject' | 'disable'
  >({
    mutationFn: async (action) => {
      const response = await apiClient.patch<APIResponse<AdminBusinessListItem>>(`/admin/pme/${businessUuid}/${action}`);
      return response.data;
    },
    onSuccess: async (payload, action) => {
      if (!payload.success) {
        toast({
          title: 'Action impossible',
          description: payload.message || 'Le statut PME n a pas pu etre mis a jour.',
          variant: 'destructive',
        });
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-pme'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-pme-detail', businessUuid] }),
      ]);
      toast({
        title: 'Statut PME mis a jour',
        description: `Action ${action} appliquee a ${payload.data?.official_name || 'la PME'}.`,
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Action impossible',
        description: error.response?.data?.message || 'Le statut PME n a pas pu etre mis a jour.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <section className="panel flex min-h-56 items-center justify-center text-muted-foreground fade-rise-in">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement de la fiche PME...
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="panel border-destructive/25 bg-destructive/10 p-8 text-center fade-rise-in">
        <p className="text-sm font-semibold text-destructive">Impossible de charger la fiche PME.</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button onClick={() => refetch()} className="rounded-lg border border-destructive/30 px-3 py-2 text-xs text-destructive">
            Reessayer
          </button>
          <button onClick={() => navigate('/admin/pme')} className="rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground">
            Retour a la liste
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="panel soft-grid relative overflow-hidden p-6 fade-rise-in">
        <div className="pointer-events-none absolute -right-20 top-0 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <Link to="/admin/pme" className="inline-flex items-center gap-2 text-xs text-primary hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour a la gestion des PME
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-primary/30 bg-primary/12 p-3 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="section-title text-3xl">{data.official_name}</h2>
                <p className="section-subtitle">Fiche complete de la PME, incidents relies et activite probatoire.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(data.validation_status)}>{data.validation_status}</Badge>
            <button
              type="button"
              onClick={() => actionMutation.mutate('approve')}
              disabled={actionMutation.isPending || data.validation_status === 'ACTIVE'}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Valider
            </button>
            <button
              type="button"
              onClick={() => actionMutation.mutate('reject')}
              disabled={actionMutation.isPending || data.validation_status === 'REJECTED'}
              className="inline-flex items-center gap-1 rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-40"
            >
              <XCircle className="h-3.5 w-3.5" />
              Rejeter
            </button>
            <button
              type="button"
              onClick={() => actionMutation.mutate('disable')}
              disabled={actionMutation.isPending || data.validation_status === 'DISABLED'}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-40"
            >
              <ShieldOff className="h-3.5 w-3.5" />
              Desactiver
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4 fade-rise-in-1">
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Incidents</p>
          <p className="mt-2 text-3xl font-semibold">{data.total_incidents}</p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Signalements relies</p>
          <p className="mt-2 text-3xl font-semibold">{data.linked_reports}</p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Dossiers prets</p>
          <p className="mt-2 text-3xl font-semibold">{data.bundles_ready}</p>
        </article>
        <article className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Derniere activite</p>
          <p className="mt-2 text-sm font-semibold">{data.last_incident_at ? new Date(data.last_incident_at).toLocaleString() : 'Aucune'}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr] fade-rise-in-2">
        <article className="panel p-5">
          <h3 className="section-title">Identite PME</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Compte</p>
              <p className="mt-2 inline-flex items-center gap-2 font-semibold"><Mail className="h-4 w-4 text-primary" />{data.email}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Contact</p>
              <p className="mt-2">{data.contact_email || 'Email non renseigne'}</p>
              <p className="mt-1 inline-flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4 text-primary" />{data.contact_phone || 'Telephone non renseigne'}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Mots-cles</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.keywords.length > 0 ? data.keywords.map((keyword) => (
                  <span key={keyword} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                    {keyword}
                  </span>
                )) : <span className="text-xs text-muted-foreground">Aucun mot-cle enregistre.</span>}
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Numeros legitimes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.legit_numbers.length > 0 ? data.legit_numbers.map((number) => (
                  <span key={number} className="rounded-full border border-border bg-secondary/20 px-3 py-1 text-xs text-foreground">
                    {number}
                  </span>
                )) : <span className="text-xs text-muted-foreground">Aucun numero legitime renseigne.</span>}
              </div>
            </div>
          </div>
        </article>

        <article className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="section-title">Incidents recents</h3>
              <p className="section-subtitle">Dernieres usurpations detectees pour cette PME.</p>
            </div>
            <Link to="/admin/signalements" className="text-xs text-primary hover:underline">
              Vue globale
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-secondary/35 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Canal</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Risque</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {data.recent_incidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Aucun incident recent.
                    </td>
                  </tr>
                ) : data.recent_incidents.map((item) => (
                  <tr key={item.incident_uuid} className="bg-card/70">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{item.public_reference}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{channelLabel(item.channel)}</td>
                    <td className="max-w-[280px] px-4 py-3"><p className="line-clamp-2">{item.message_preview}</p></td>
                    <td className="px-4 py-3 font-semibold">{item.risk_score}/100</td>
                    <td className="px-4 py-3">
                      <Badge variant={alertStatusVariant(item.report_status)}>{alertStatusLabel(item.report_status)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="panel p-5 fade-rise-in-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="section-title">Signalements relies</h3>
            <p className="section-subtitle">Derniers signalements citoyens relies a cette PME.</p>
          </div>
          <Link to="/admin/dossiers" className="text-xs text-primary hover:underline">
            Ouvrir les dossiers probatoires
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-secondary/35 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Risque</th>
                <th className="px-4 py-3">Pieces</th>
                <th className="px-4 py-3">Dossiers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {data.recent_reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Aucun signalement recent.
                  </td>
                </tr>
              ) : data.recent_reports.map((item) => (
                <tr key={item.report_uuid} className="bg-card/70">
                  <td className="px-4 py-3 font-mono text-xs text-primary">{item.public_reference}</td>
                  <td className="max-w-[360px] px-4 py-3"><p className="line-clamp-2">{item.message_preview}</p></td>
                  <td className="px-4 py-3 font-semibold">{item.risk_score}/100</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.attachments_count}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.bundles_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
