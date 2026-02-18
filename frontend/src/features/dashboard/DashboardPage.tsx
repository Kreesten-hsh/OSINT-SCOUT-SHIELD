import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, FileBarChart, Link2, ShieldCheck, Signal, Siren, Wifi } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import type { CitizenIncidentListData } from '@/types';
import { useAuthStore } from '@/store/auth-store';
import { Badge } from '@/components/ui/badge';
import { alertStatusLabel, alertStatusVariant, displayTarget } from '@/lib/presentation';

interface WeeklyStats {
    current_week_count: number;
    delta_percent: number;
}

interface TopAlert {
    id: number;
    uuid: string;
    url: string;
    source_type: string;
    created_at: string;
    risk_score: number;
    status: 'NEW' | 'IN_REVIEW' | 'CONFIRMED' | 'DISMISSED' | 'BLOCKED_SIMULATED';
    title?: string;
}

interface CriticalThreats {
    count: number;
    top_alerts: TopAlert[];
}

interface CountResponse {
    count: number;
}

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);
    const apiRoot = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '');

    const { data: healthState } = useQuery({
        queryKey: ['dashboard', 'health'],
        queryFn: async () => {
            const response = await fetch(`${apiRoot}/health`);
            if (!response.ok) {
                throw new Error('health endpoint unavailable');
            }
            return (await response.json()) as {
                status?: string;
                components?: { db?: string; redis?: string };
            };
        },
        retry: 1,
        staleTime: 10_000,
    });

    const { data: weeklyStats } = useQuery({
        queryKey: ['dashboard', 'weekly'],
        queryFn: async () => {
            const res = await apiClient.get<WeeklyStats>('/dashboard/stats/weekly');
            return res.data;
        },
    });

    const { data: criticalThreats } = useQuery({
        queryKey: ['dashboard', 'critical'],
        queryFn: async () => {
            const res = await apiClient.get<CriticalThreats>('/dashboard/stats/critical-threats?threshold=85');
            return res.data;
        },
    });

    const { data: sourcesData } = useQuery({
        queryKey: ['dashboard', 'sources'],
        queryFn: async () => {
            const res = await apiClient.get<CountResponse>('/dashboard/stats/sources-active');
            return res.data;
        },
    });

    const { data: reportsData } = useQuery({
        queryKey: ['dashboard', 'reports'],
        queryFn: async () => {
            const res = await apiClient.get<CountResponse>('/dashboard/stats/reports-count');
            return res.data;
        },
    });

    const { data: recentCitizenIncidents } = useQuery({
        queryKey: ['dashboard', 'citizen-recent'],
        queryFn: async () => {
            const res = await apiClient.get<APIResponse<CitizenIncidentListData>>('/incidents/citizen?skip=0&limit=5');
            return res.data.data?.items ?? [];
        },
    });

    const cards = useMemo(
        () => [
            {
                label: 'Alertes semaine',
                value: weeklyStats?.current_week_count ?? 0,
                extra:
                    weeklyStats && Number.isFinite(weeklyStats.delta_percent)
                        ? `${weeklyStats.delta_percent > 0 ? '+' : ''}${weeklyStats.delta_percent}% vs semaine precedente`
                        : 'Indicateur en attente',
                icon: AlertTriangle,
                tone: 'text-amber-300',
            },
            {
                label: 'Menaces critiques',
                value: criticalThreats?.count ?? 0,
                extra: 'Score >= 85',
                icon: Siren,
                tone: 'text-red-300',
            },
            {
                label: 'Sources actives',
                value: sourcesData?.count ?? 0,
                extra: 'Collecte continue',
                icon: Wifi,
                tone: 'text-emerald-300',
            },
            {
                label: 'Rapports certifies',
                value: reportsData?.count ?? 0,
                extra: 'Preuves disponibles',
                icon: FileBarChart,
                tone: 'text-primary',
            },
        ],
        [criticalThreats?.count, reportsData?.count, sourcesData?.count, weeklyStats]
    );

    return (
        <div className="space-y-6">
            <section className="panel soft-grid relative overflow-hidden p-6">
                <div className="pointer-events-none absolute -right-24 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-primary/90">National Anti-Scam Console</p>
                        <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Pilotage operationnel SOC</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Session active: <span className="font-semibold text-foreground">{user?.email || 'analyste@local'}</span>
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                        <ShieldCheck className="h-4 w-4" />
                        Disponibilite API/DB/Redis:{' '}
                        {healthState?.status === 'ok' || healthState?.status === 'healthy'
                            ? 'OK'
                            : 'A verifier'}
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <article key={card.label} className="panel p-4">
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

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
                <article className="panel p-5 xl:col-span-3">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-display text-lg font-semibold">Menaces critiques prioritaires</h3>
                        <Link to="/alerts" className="text-xs text-primary hover:underline">
                            Ouvrir toutes les alertes
                        </Link>
                    </div>

                    {criticalThreats?.top_alerts?.length ? (
                        <div className="space-y-2">
                            {criticalThreats.top_alerts.map((alert) => (
                                <Link
                                    key={alert.id}
                                    to={`/alerts/${alert.uuid}`}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-3 transition hover:border-primary/40"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium" title={alert.url}>
                                            {displayTarget(alert.url)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="destructive">Score {alert.risk_score}</Badge>
                                        <Badge variant={alertStatusVariant(alert.status)}>{alertStatusLabel(alert.status)}</Badge>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="rounded-xl border border-border/70 bg-background/50 px-3 py-4 text-sm text-muted-foreground">
                            Aucun dossier critique actif pour le moment.
                        </p>
                    )}
                </article>

                <article className="panel p-5 xl:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-display text-lg font-semibold">Incidents citoyens recents</h3>
                        <Link to="/incidents-signales" className="text-xs text-primary hover:underline">
                            Ouvrir la file
                        </Link>
                    </div>

                    {recentCitizenIncidents?.length ? (
                        <div className="space-y-2">
                            {recentCitizenIncidents.map((incident) => (
                                <Link
                                    key={incident.alert_uuid}
                                    to={`/incidents-signales/${incident.alert_uuid}`}
                                    className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/55 px-3 py-3 transition hover:border-primary/40"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{incident.phone_number}</p>
                                        <p className="text-xs text-muted-foreground">{incident.message_preview || 'Message non fourni'}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge variant={alertStatusVariant(incident.status)}>{alertStatusLabel(incident.status)}</Badge>
                                        <span className="text-xs text-muted-foreground">Risque {incident.risk_score}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="rounded-xl border border-border/70 bg-background/50 px-3 py-4 text-sm text-muted-foreground">
                            Aucun signalement citoyen recent.
                        </p>
                    )}
                </article>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Link to="/verify" className="panel flex items-center gap-3 p-4 transition hover:border-primary/45">
                    <Signal className="h-4 w-4 text-primary" />
                    <div>
                        <p className="text-sm font-semibold">Canal citoyen</p>
                        <p className="text-xs text-muted-foreground">Verifier ou signaler un cas</p>
                    </div>
                </Link>
                <Link to="/reports" className="panel flex items-center gap-3 p-4 transition hover:border-primary/45">
                    <FileBarChart className="h-4 w-4 text-primary" />
                    <div>
                        <p className="text-sm font-semibold">Rapports</p>
                        <p className="text-xs text-muted-foreground">PDF et snapshots forensiques</p>
                    </div>
                </Link>
                <Link to="/monitoring" className="panel flex items-center gap-3 p-4 transition hover:border-primary/45">
                    <Link2 className="h-4 w-4 text-primary" />
                    <div>
                        <p className="text-sm font-semibold">Surveillance</p>
                        <p className="text-xs text-muted-foreground">Sources automatiques et executions</p>
                    </div>
                </Link>
            </section>
        </div>
    );
}
