import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, Building2, FileBadge2, Loader2, RadioTower, ShieldAlert, Users } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { alertStatusLabel, alertStatusVariant, riskTone } from '@/lib/presentation';
import type { AdminDashboardData, AlertStatus, TransmissionStatus } from '@/types';

const TRANSMISSION_LABELS: Record<TransmissionStatus, string> = {
  PENDING: 'En attente',
  QUEUED: 'En file',
  SENT: 'Envoye',
  RETRYING: 'Relance',
  FAILED: 'Echec',
  DELIVERED: 'Livre',
};

function ChartSkeleton() {
  return (
    <div className="space-y-3 py-2 animate-pulse">
      <div className="h-4 w-1/3 rounded bg-secondary/40" />
      <div className="h-56 rounded-xl bg-secondary/30" />
      <div className="h-3 w-2/3 rounded bg-secondary/30" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<AdminDashboardData>>('/admin/dashboard');
      return response.data.data;
    },
  });

  const lineData = (data?.reports_by_day ?? []).map((item) => ({
    date: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    count: item.count,
  }));

  const summaryCards = [
    {
      label: 'Signalements formels',
      value: data?.total_reports ?? 0,
      extra: 'Total consolide du flux citoyen',
      icon: ShieldAlert,
      tone: 'text-red-300',
    },
    {
      label: 'Signalements ouverts',
      value: data?.open_reports ?? 0,
      extra: 'Nouveaux et en revue',
      icon: Activity,
      tone: 'text-amber-300',
    },
    {
      label: 'Dossiers prets',
      value: data?.bundles_ready ?? 0,
      extra: 'Bundles forensiques disponibles',
      icon: FileBadge2,
      tone: 'text-primary',
    },
    {
      label: 'PME actives',
      value: data?.active_businesses ?? 0,
      extra: 'Comptes valides par l admin',
      icon: Building2,
      tone: 'text-emerald-300',
    },
    {
      label: 'PME en attente',
      value: data?.pending_businesses ?? 0,
      extra: 'Demandes a traiter',
      icon: Users,
      tone: 'text-sky-300',
    },
    {
      label: 'Transmissions non resolues',
      value: data?.transmissions_pending ?? 0,
      extra: `${data?.transmissions_failed ?? 0} en echec`,
      icon: RadioTower,
      tone: 'text-fuchsia-300',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="panel soft-grid relative overflow-hidden p-6 fade-rise-in">
        <div className="pointer-events-none absolute -right-24 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary/90">BENIN CYBER SHIELD</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Tableau de bord national</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Vision consolidee du flux citoyen, des usurpations PME et des transmissions externes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/transmissions"
              className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/25"
            >
              Voir les transmissions
            </Link>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
            >
              {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Actualiser
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6 fade-rise-in-1">
        {summaryCards.map((card) => (
          <article key={card.label} className="panel interactive-row p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold">{card.value}</p>
              </div>
              <div className={`rounded-xl border border-border/80 bg-background/60 p-2 ${card.tone}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{card.extra}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12 fade-rise-in-2">
        <article className="panel p-5 xl:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="section-title">Evolution des signalements (7 jours)</h3>
            <Link to="/admin/signalements" className="text-xs text-primary hover:underline">
              Ouvrir les signalements
            </Link>
          </div>

          {isLoading ? (
            <ChartSkeleton />
          ) : isError ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-6 text-sm text-destructive">
              Impossible de charger le tableau de bord.
            </p>
          ) : lineData.some((item) => item.count > 0) ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey="date" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: '1px solid rgba(148,163,184,0.35)',
                      borderRadius: '0.75rem',
                      color: '#E2E8F0',
                    }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#0EA5E9" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="rounded-xl border border-border/70 bg-background/50 px-3 py-6 text-sm text-muted-foreground">
              Aucun signalement formalise sur les 7 derniers jours.
            </p>
          )}
        </article>

        <article className="panel p-5 xl:col-span-5">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
            <div>
              <h3 className="section-title mb-3">Statuts des signalements</h3>
              <div className="space-y-2">
                {Object.entries(data?.reports_by_status ?? {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between rounded-xl border border-border/70 bg-background/50 px-3 py-2">
                    <Badge variant={alertStatusVariant(status as AlertStatus)}>{alertStatusLabel(status as AlertStatus)}</Badge>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="section-title mb-3">Statuts des transmissions</h3>
              <div className="space-y-2">
                {Object.entries(data?.transmissions_by_status ?? {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between rounded-xl border border-border/70 bg-background/50 px-3 py-2">
                    <span className="text-sm text-muted-foreground">{TRANSMISSION_LABELS[status as TransmissionStatus] ?? status}</span>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12 fade-rise-in-3">
        <article className="panel p-5 xl:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="section-title">Signalements recents</h3>
            <Link to="/admin/signalements" className="text-xs text-primary hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="space-y-2">
            {(data?.recent_reports ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-background/40 px-3 py-6 text-sm text-muted-foreground">
                Aucun signalement recent.
              </p>
            ) : (
              data?.recent_reports.map((report) => (
                <Link
                  key={report.report_uuid}
                  to={`/admin/signalements/${report.legacy_alert_uuid ?? report.report_uuid}`}
                  className="interactive-row block rounded-xl border border-border/70 bg-background/50 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{report.public_reference}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{report.message_preview}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {report.suspect_phone_masked} · {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={alertStatusVariant(report.status)}>{alertStatusLabel(report.status)}</Badge>
                      <p className={`mt-2 text-sm font-semibold ${riskTone(report.risk_score)}`}>{report.risk_score}/100</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="panel p-5 xl:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="section-title">PME les plus ciblees</h3>
            <Link to="/admin/pme" className="text-xs text-primary hover:underline">
              Gerer les PME
            </Link>
          </div>
          <div className="space-y-2">
            {(data?.top_targeted_businesses ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-background/40 px-3 py-6 text-sm text-muted-foreground">
                Aucune usurpation reliee a une PME.
              </p>
            ) : (
              data?.top_targeted_businesses.map((business) => (
                <div key={business.business_uuid} className="rounded-xl border border-border/70 bg-background/50 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{business.official_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Dernier incident {business.last_incident_at ? new Date(business.last_incident_at).toLocaleString() : 'non disponible'}
                      </p>
                    </div>
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {business.incidents_count}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="panel p-5 xl:col-span-3">
          <h3 className="section-title mb-4">Numeros recurrents</h3>
          <div className="space-y-2">
            {(data?.top_suspect_numbers ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-background/40 px-3 py-6 text-sm text-muted-foreground">
                Aucun numero suspect agrege.
              </p>
            ) : (
              data?.top_suspect_numbers.map((number) => (
                <div key={number.suspect_number_uuid} className="rounded-xl border border-border/70 bg-background/50 px-3 py-3">
                  <p className="text-sm font-semibold">{number.masked_phone}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {number.reports_count} signalement{number.reports_count > 1 ? 's' : ''}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Derniere activite {number.last_seen ? new Date(number.last_seen).toLocaleString() : 'non disponible'}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
