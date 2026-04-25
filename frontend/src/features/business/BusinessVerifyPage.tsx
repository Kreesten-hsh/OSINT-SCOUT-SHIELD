import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, FileText, Loader2, RefreshCcw, ShieldAlert, Siren } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import type { PmeDashboardData } from '@/types';
import { alertStatusLabel, alertStatusVariant, channelLabel } from '@/lib/presentation';

export default function BusinessVerifyPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['pme-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<PmeDashboardData>>('/pme/dashboard');
      return response.data.data;
    },
  });

  return (
    <div className="space-y-5">
      <section className="panel p-5 fade-rise-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title text-2xl">Tableau de bord PME</h2>
            <p className="section-subtitle">
              Vue d'ensemble des usurpations detectees et des dossiers probatoires disponibles pour votre entreprise.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
          >
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            Actualiser
          </button>
        </div>
      </section>

      {isLoading && (
        <section className="panel flex min-h-56 items-center justify-center text-muted-foreground fade-rise-in-1">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement du tableau de bord PME...
        </section>
      )}

      {isError && !isLoading && (
        <section className="panel border-destructive/25 bg-destructive/10 p-8 text-center fade-rise-in-1">
          <p className="text-sm font-semibold text-destructive">Impossible de charger le tableau de bord PME.</p>
        </section>
      )}

      {!isLoading && !isError && data && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 fade-rise-in-1">
            <article className="panel p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Incidents lies</p>
                  <p className="mt-2 text-3xl font-semibold">{data.total_incidents}</p>
                </div>
                <ShieldAlert className="h-8 w-8 text-primary" />
              </div>
            </article>
            <article className="panel p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Nouveaux</p>
                  <p className="mt-2 text-3xl font-semibold">{data.new_incidents}</p>
                </div>
                <Siren className="h-8 w-8 text-amber-300" />
              </div>
            </article>
            <article className="panel p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Signalements relies</p>
                  <p className="mt-2 text-3xl font-semibold">{data.linked_reports}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-300" />
              </div>
            </article>
            <article className="panel p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Dossiers prets</p>
                  <p className="mt-2 text-3xl font-semibold">{data.bundles_ready}</p>
                </div>
                <FileText className="h-8 w-8 text-emerald-300" />
              </div>
            </article>
          </section>

          <section className="panel p-5 fade-rise-in-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">{data.official_name}</h3>
                <p className="text-sm text-muted-foreground">
                  Dernier incident: {data.last_incident_at ? new Date(data.last_incident_at).toLocaleString() : 'Aucun incident'}
                </p>
              </div>
              <Badge variant={data.validation_status === 'ACTIVE' ? 'success' : 'outline'}>{data.validation_status}</Badge>
            </div>

            {data.recent_incidents.length === 0 ? (
              <div className="rounded-lg border border-border/70 bg-secondary/20 px-4 py-6 text-sm text-muted-foreground">
                Aucune alerte d'usurpation n'a encore ete detectee pour votre PME.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-secondary/35 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Canal</th>
                      <th className="px-4 py-3">Message</th>
                      <th className="px-4 py-3">Risque</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {data.recent_incidents.map((item) => (
                      <tr key={item.incident_uuid} className="bg-card/70">
                        <td className="px-4 py-3 font-mono text-xs text-primary">{item.public_reference}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{channelLabel(item.channel)}</td>
                        <td className="max-w-[360px] px-4 py-3">
                          <p className="line-clamp-2">{item.message_preview}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.risk_score}/100</td>
                        <td className="px-4 py-3">
                          <Badge variant={alertStatusVariant(item.report_status)}>{alertStatusLabel(item.report_status)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
