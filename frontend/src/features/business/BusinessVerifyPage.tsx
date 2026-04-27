import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2, RefreshCcw, ShieldAlert } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import PageHero from '@/components/layout/PageHero';
import { Badge } from '@/components/ui/badge';
import type { PmeDashboardData } from '@/types';
import { alertStatusLabel, alertStatusVariant, channelLabel } from '@/lib/presentation';

function statusVariant(status: PmeDashboardData['validation_status']): 'outline' | 'success' | 'destructive' | 'secondary' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'REJECTED') return 'destructive';
  if (status === 'DISABLED') return 'secondary';
  return 'outline';
}

export default function BusinessVerifyPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['pme-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<PmeDashboardData>>('/pme/dashboard');
      return response.data.data;
    },
  });

  const readiness = useMemo(() => {
    if (!data || data.linked_reports === 0) {
      return 0;
    }
    return Math.round((data.bundles_ready / data.linked_reports) * 100);
  }, [data]);

  const lastIncidentLabel = useMemo(() => {
    if (!data?.last_incident_at) {
      return 'Aucun incident recent';
    }
    return new Date(data.last_incident_at).toLocaleString();
  }, [data?.last_incident_at]);

  return (
    <div className="space-y-5">
      <PageHero
        title={data?.official_name || 'Tableau de bord PME'}
        subtitle="Vue simple de vos incidents d usurpation, des signalements relies et des dossiers probatoires disponibles."
        eyebrow={
          <>
            <Badge variant={statusVariant(data?.validation_status ?? 'PENDING_APPROVAL')}>
              {data?.validation_status ?? 'PENDING_APPROVAL'}
            </Badge>
            <Badge variant="secondary">Portail PME</Badge>
          </>
        }
        actions={
          <>
            <Link to="/verify" className="hero-action-primary">
              Verifier un message
            </Link>
            <Link to="/pme/dossiers" className="hero-action-secondary">
              Ouvrir les dossiers
            </Link>
            <button onClick={() => refetch()} className="hero-action-secondary">
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Actualiser
            </button>
          </>
        }
      />

      {isLoading && (
        <section className="panel flex min-h-56 items-center justify-center text-muted-foreground fade-rise-in-1">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement du tableau de bord PME...
        </section>
      )}

      {isError && !isLoading && (
        <section className="panel border-destructive/25 bg-destructive/10 p-8 text-center fade-rise-in-1">
          <p className="text-sm font-semibold text-destructive">Impossible de charger le tableau de bord PME.</p>
          <button onClick={() => refetch()} className="mt-3 rounded-lg border border-destructive/30 px-3 py-2 text-xs text-destructive">
            Reessayer
          </button>
        </section>
      )}

      {!isLoading && !isError && data && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 fade-rise-in-1">
            <article className="metric-card">
              <p className="metric-card-label">Incidents</p>
              <p className="metric-card-value">{data.total_incidents}</p>
              <p className="metric-card-helper">Usurpations detectees</p>
            </article>
            <article className="metric-card">
              <p className="metric-card-label">Nouveaux cas</p>
              <p className="metric-card-value">{data.new_incidents}</p>
              <p className="metric-card-helper">A traiter rapidement</p>
            </article>
            <article className="metric-card">
              <p className="metric-card-label">Signalements relies</p>
              <p className="metric-card-value">{data.linked_reports}</p>
              <p className="metric-card-helper">Messages relies a votre marque</p>
            </article>
            <article className="metric-card">
              <p className="metric-card-label">Dossiers prets</p>
              <p className="metric-card-value">{data.bundles_ready}</p>
              <p className="metric-card-helper">Preuves exportables</p>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr] fade-rise-in-2">
            <article className="panel p-5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <h3 className="section-title">Etat de surveillance</h3>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Couverture probatoire</p>
                    <span className="text-xl font-semibold">{readiness}%</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary/35">
                    <div className="h-full rounded-full bg-primary/80" style={{ width: `${readiness}%` }} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {data.bundles_ready} dossier(s) pret(s) sur {data.linked_reports} signalement(s) relies.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Dernier incident detecte</p>
                  <p className="mt-2 text-sm font-semibold">{lastIncidentLabel}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Link
                    to="/pme/profil"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-input px-4 text-sm text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                  >
                    Mettre a jour la fiche PME
                  </Link>
                  <Link
                    to="/pme/signalements"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-input px-4 text-sm text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                  >
                    Voir les signalements
                  </Link>
                </div>
              </div>
            </article>

            <article className="panel p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="section-title">Incidents recents</h3>
                  <p className="section-subtitle">Dernieres alertes reliees a votre PME.</p>
                </div>
                <Link to="/pme/alertes" className="text-xs text-primary hover:underline">
                  Voir tout
                </Link>
              </div>

              {data.recent_incidents.length === 0 ? (
                <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-8 text-sm text-muted-foreground">
                  Aucune alerte d usurpation n a encore ete detectee pour votre PME.
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="table-base min-w-[680px]">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Canal</th>
                        <th>Message</th>
                        <th>Risque</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_incidents.map((item) => (
                        <tr key={item.incident_uuid} className="table-row">
                          <td className="font-mono text-xs text-primary">{item.public_reference}</td>
                          <td className="text-xs text-muted-foreground">{channelLabel(item.channel)}</td>
                          <td className="max-w-[320px]">
                            <p className="line-clamp-2">{item.message_preview}</p>
                          </td>
                          <td>
                            <div className="inline-flex items-center gap-2 font-semibold">
                              <AlertTriangle className="h-4 w-4 text-amber-300" />
                              {item.risk_score}/100
                            </div>
                          </td>
                          <td>
                            <Badge variant={alertStatusVariant(item.report_status)}>{alertStatusLabel(item.report_status)}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}
