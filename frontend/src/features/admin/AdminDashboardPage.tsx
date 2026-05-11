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
import PageHero from '@/components/layout/PageHero';
import { Badge } from '@/components/ui/badge';
import BeninSignalMap from '@/features/live/BeninSignalMap';
import { categoryLabel } from '@/lib/presentation';
import type { AdminCategoryCount, AdminDashboardData, MapOverviewData, TransmissionStatus, TransmissionTargetType } from '@/types';

const CATEGORY_COLORS = ['#0f6a2f', '#2e7dff', '#ef4444', '#f59e0b', '#14b8a6'];

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
  return [
    { category: 'mobile_money', count: data?.total_reports ?? 0 },
    { category: 'fake_agent', count: data?.daily_reports ?? 0 },
  ].filter((item) => item.count > 0);
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

  const { data: mapOverview } = useQuery({
    queryKey: ['admin-dashboard-map-preview'],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<MapOverviewData>>('/map/overview', {
        params: { window: '7d', risk: 'all' },
      });
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

  return (
    <div className="space-y-6">
      <PageHero
        title="Tableau de bord national"
        subtitle="Vue consolidee des signalements citoyens, des transmissions et de l activite PME."
        actions={
          <>
            <span className="inline-flex min-h-[40px] items-center rounded-xl border border-input bg-background/70 px-4 text-sm text-muted-foreground">
              7 derniers jours
            </span>
            <Link to="/admin/transmissions" className="hero-action-primary">
              Voir les transmissions
            </Link>
            <button onClick={() => refetch()} className="hero-action-secondary">
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Actualiser
            </button>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 fade-rise-in-1">
        {summaryCards.map((card) => (
          <article key={card.label} className="metric-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="metric-card-label">{card.label}</p>
                <p className="metric-card-value">{card.value}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/60 p-3 text-primary">
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="metric-card-helper">{card.helper}</p>
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
        <article className="panel overflow-hidden p-0 xl:col-span-4">
          <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5">
            <div>
              <h3 className="section-title">Carte du Benin</h3>
            </div>
            <Link to="/live" className="text-xs text-primary hover:underline">
              Ouvrir
            </Link>
          </div>

          <Link to="/live" className="block border-t border-border/70 bg-background/60 p-3 transition hover:bg-secondary/30">
            <div className="overflow-hidden rounded-[1.35rem] border border-border/70">
              <BeninSignalMap
                departments={mapOverview?.departments ?? []}
                selectedDepartment={null}
                compact
                className="h-[310px] w-full"
              />
            </div>
          </Link>
        </article>

        <article className="panel p-5 xl:col-span-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="section-title">Transmissions recentes</h3>
              <p className="section-subtitle">Derniers dossiers envoyes vers l ANSSI/OCRC et les operateurs.</p>
            </div>
            <Badge variant="outline">{data?.transmission_success_rate ?? 0}% de succes</Badge>
          </div>

          <div className="table-scroll">
            <table className="table-base min-w-[620px]">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Destinataire</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent_transmissions ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="table-empty">
                      Aucune transmission recente.
                    </td>
                  </tr>
                ) : (
                  data?.recent_transmissions.map((transmission) => (
                    <tr key={transmission.transmission_uuid} className="table-row">
                      <td className="font-mono text-xs text-primary">{transmission.public_reference}</td>
                      <td className="text-sm text-muted-foreground">{TARGET_LABELS[transmission.target_type]}</td>
                      <td>
                        <Badge variant={transmissionBadgeVariant(transmission.status)}>
                          {TRANSMISSION_LABELS[transmission.status]}
                        </Badge>
                      </td>
                      <td className="text-xs text-muted-foreground">
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
