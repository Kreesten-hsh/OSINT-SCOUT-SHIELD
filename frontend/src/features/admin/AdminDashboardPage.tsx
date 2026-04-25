import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, Building2, Loader2, RadioTower, RefreshCcw, Siren, ShieldAlert } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { alertStatusLabel, alertStatusVariant, categoryLabel } from '@/lib/presentation';
import type { AdminCategoryCount, AdminDashboardData, AlertStatus, TransmissionStatus, TransmissionTargetType } from '@/types';

const CATEGORY_COLORS = ['#0f6a2f', '#2e7dff', '#ef4444', '#f59e0b', '#14b8a6'];
const VISIBLE_STATUSES: AlertStatus[] = ['NEW', 'IN_REVIEW', 'DISMISSED'];

const TRANSMISSION_LABELS: Record<TransmissionStatus, string> = {
  PENDING: 'En attente',
  QUEUED: 'En file',
  SENT: 'Envoye',
  RETRYING: 'Relance',
  FAILED: 'Echec',
  DELIVERED: 'Livre',
};

const TARGET_LABELS: Record<TransmissionTargetType, string> = {
  ANSSI_OCRC: 'ANSSI/OCRC',
  OPERATORS: 'Operateurs',
};

function ChartSkeleton() {
  return (
    <div className="space-y-3 py-2 animate-pulse">
      <div className="h-4 w-1/3 rounded bg-secondary/40" />
      <div className="h-72 rounded-2xl bg-secondary/30" />
    </div>
  );
}

function categoryFallback(data: AdminDashboardData | undefined): AdminCategoryCount[] {
  return VISIBLE_STATUSES.map((status) => ({
    category: status.toLowerCase(),
    count: data?.reports_by_status?.[status] ?? 0,
  })).filter((item) => item.count > 0);
}

function transmissionBadgeVariant(status: TransmissionStatus): 'outline' | 'secondary' | 'warning' | 'destructive' | 'success' {
  if (status === 'FAILED') return 'destructive';
  if (status === 'DELIVERED') return 'success';
  if (status === 'RETRYING') return 'warning';
  if (status === 'QUEUED' || status === 'SENT') return 'secondary';
  return 'outline';
}

export default function AdminDashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<AdminDashboardData>>('/admin/dashboard');
      return response.data.data;
    },
  });

  const lineData = useMemo(
    () =>
      (data?.reports_by_day ?? []).map((item) => ({
        date: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        count: item.count,
      })),
    [data?.reports_by_day],
  );

  const categoryData = useMemo(
    () =>
      (data?.reports_by_category?.length ? data.reports_by_category : categoryFallback(data)).map((item, index) => ({
        ...item,
        fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      })),
    [data],
  );

  const summaryCards = [
    {
      label: 'Total signalements',
      value: data?.total_reports ?? 0,
      helper: `${data?.open_reports ?? 0} en cours`,
      icon: ShieldAlert,
    },
    {
      label: 'Aujourd hui',
      value: data?.daily_reports ?? 0,
      helper: 'Flux citoyen du jour',
      icon: Activity,
    },
    {
      label: 'PME actives',
      value: data?.active_businesses ?? 0,
      helper: `${data?.pending_businesses ?? 0} en attente`,
      icon: Building2,
    },
    {
      label: 'Transmissions',
      value: `${data?.transmission_success_rate ?? 0}%`,
      helper: `${data?.transmissions_failed ?? 0} echecs`,
      icon: RadioTower,
    },
    {
      label: 'Campagnes',
      value: data?.active_campaigns ?? 0,
      helper: 'Sous surveillance',
      icon: Siren,
    },
  ];

  const statusCards = VISIBLE_STATUSES.map((status) => ({
    status,
    count: data?.reports_by_status?.[status] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <section className="panel p-6 fade-rise-in">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tableau de bord national</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Vue consolidee des signalements citoyens, des transmissions et de l activite PME.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-10 items-center rounded-xl border border-input bg-background/70 px-4 text-sm text-muted-foreground">
              7 derniers jours
            </span>
            <Link
              to="/admin/transmissions"
              className="inline-flex h-10 items-center rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary transition hover:bg-primary/20"
            >
              Voir les transmissions
            </Link>
            <button
              onClick={() => refetch()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-input px-4 text-sm text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Actualiser
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 fade-rise-in-1">
        {summaryCards.map((card) => (
          <article key={card.label} className="panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{card.label}</p>
                <p className="mt-4 text-4xl font-semibold">{card.value}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/60 p-3 text-primary">
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12 fade-rise-in-2">
        <article className="panel p-5 xl:col-span-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="section-title">Signalements par jour</h3>
              <p className="section-subtitle">Evolution journaliere des depots citoyens formalises.</p>
            </div>
            <Badge variant="secondary">{data?.daily_reports ?? 0} aujourd hui</Badge>
          </div>

          {isLoading ? (
            <ChartSkeleton />
          ) : isError ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-6 text-sm text-destructive">
              Impossible de charger le tableau de bord.
            </p>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData}>
                  <defs>
                    <linearGradient id="reportsGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#0f6a2f" stopOpacity={0.38} />
                      <stop offset="100%" stopColor="#0f6a2f" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                  <XAxis dataKey="date" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09140d',
                      border: '1px solid rgba(148,163,184,0.35)',
                      borderRadius: '0.9rem',
                      color: '#E2E8F0',
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#0f6a2f" strokeWidth={4} fill="url(#reportsGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="panel p-5 xl:col-span-4">
          <div className="mb-4">
            <h3 className="section-title">Repartition par categorie</h3>
            <p className="section-subtitle">Categories detectees par le moteur d analyse.</p>
          </div>

          {isLoading ? (
            <ChartSkeleton />
          ) : categoryData.length > 0 ? (
            <>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="count" nameKey="category" innerRadius={68} outerRadius={96} paddingAngle={4}>
                      {categoryData.map((entry) => (
                        <Cell key={entry.category} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | string | undefined, name: string | undefined) => [value ?? 0, categoryLabel(name)]}
                      contentStyle={{
                        backgroundColor: '#09140d',
                        border: '1px solid rgba(148,163,184,0.35)',
                        borderRadius: '0.9rem',
                        color: '#E2E8F0',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {categoryData.map((item) => (
                  <div key={item.category} className="flex items-center justify-between rounded-xl border border-border/70 bg-background/50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                      <span className="text-sm text-muted-foreground">{categoryLabel(item.category)}</span>
                    </div>
                    <span className="text-sm font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="rounded-xl border border-border/70 bg-background/50 px-3 py-6 text-sm text-muted-foreground">
              Les categories apparaitront ici des que des signalements seront disponibles.
            </p>
          )}
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12 fade-rise-in-3">
        <article className="panel p-5 xl:col-span-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="section-title">Statuts des signalements</h3>
              <p className="section-subtitle">Charge de traitement visible dans le portail admin.</p>
            </div>
            <Link to="/admin/signalements" className="text-xs text-primary hover:underline">
              Voir tout
            </Link>
          </div>

          <div className="space-y-3">
            {statusCards.map((item) => (
              <div key={item.status} className="rounded-2xl border border-border/70 bg-background/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant={alertStatusVariant(item.status)}>{alertStatusLabel(item.status)}</Badge>
                  <span className="text-sm font-semibold">{item.count}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary/35">
                  <div
                    className="h-full rounded-full bg-primary/80"
                    style={{ width: `${data?.total_reports ? (item.count / data.total_reports) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5 xl:col-span-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="section-title">Transmissions recentes</h3>
              <p className="section-subtitle">Derniers dossiers envoyes vers l ANSSI/OCRC et les operateurs.</p>
            </div>
            <Badge variant="outline">{data?.transmission_success_rate ?? 0}% de succes</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-secondary/35 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Destinataire</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {(data?.recent_transmissions ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Aucune transmission recente.
                    </td>
                  </tr>
                ) : (
                  data?.recent_transmissions.map((transmission) => (
                    <tr key={transmission.transmission_uuid} className="bg-card/70">
                      <td className="px-4 py-3 font-mono text-xs text-primary">{transmission.public_reference}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{TARGET_LABELS[transmission.target_type]}</td>
                      <td className="px-4 py-3">
                        <Badge variant={transmissionBadgeVariant(transmission.status)}>
                          {TRANSMISSION_LABELS[transmission.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(transmission.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
