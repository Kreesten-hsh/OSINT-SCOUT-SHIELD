import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle, Loader2 } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { Alert } from '@/types';
import { Badge } from '@/components/ui/badge';
import { alertStatusLabel, alertStatusVariant, displayTarget, safeHostname } from '@/lib/presentation';

interface AnalysisStats {
    global_risk_score: number;
    analyzed_count: number;
    top_entities: string[];
    threat_distribution: { name: string; value: number; color: string }[];
}

export default function AnalysisPage() {
    const navigate = useNavigate();

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['analysis-stats'],
        queryFn: async () => {
            const response = await apiClient.get<AnalysisStats>('/analysis/stats');
            return response.data;
        },
    });

    const { data: pendingAlerts, isLoading: alertsLoading } = useQuery({
        queryKey: ['alerts', 'pending-validation'],
        queryFn: async () => {
            const response = await apiClient.get<Alert[]>('/alerts?status=IN_REVIEW&limit=50');
            return response.data || [];
        },
    });

    const validationQueue = useMemo(() => (pendingAlerts ?? []).filter((alert) => alert.risk_score >= 50), [pendingAlerts]);

    if (statsLoading || alertsLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement des donnees analytiques...
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <section className="panel p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="font-display text-2xl font-semibold tracking-tight">Centre d'analyse</h2>
                        <p className="text-sm text-muted-foreground">Supervision des dossiers en revision et priorisation analyste.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                        <Activity className="h-4 w-4 text-primary" />
                        File a valider: <span className="font-semibold text-foreground">{validationQueue.length}</span>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <article className="panel p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Score moyen</p>
                    <p className="mt-2 text-2xl font-semibold">{stats?.global_risk_score ?? 0}/100</p>
                </article>
                <article className="panel p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Analyses traitees</p>
                    <p className="mt-2 text-2xl font-semibold">{stats?.analyzed_count ?? 0}</p>
                </article>
                <article className="panel p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Entites frequentes</p>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{stats?.top_entities?.join(', ') || 'Aucune entite dominante'}</p>
                </article>
            </section>

            <section className="panel p-4">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold">Dossiers en attente de validation</h3>
                    <button
                        onClick={() => navigate('/alerts?status=IN_REVIEW')}
                        className="rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                    >
                        Ouvrir alertes IN_REVIEW
                    </button>
                </div>

                {validationQueue.length === 0 ? (
                    <div className="rounded-xl border border-border/70 bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
                        <CheckCircle className="mx-auto mb-2 h-6 w-6 text-emerald-300" />
                        Aucune alerte en attente critique.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {validationQueue.map((alert) => (
                            <button
                                key={alert.id}
                                onClick={() => navigate(`/alerts/${alert.uuid}`)}
                                className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-3 text-left transition hover:border-primary/40"
                            >
                                <div className="min-w-0">
                                    <p className="line-clamp-1 text-sm font-medium" title={alert.url}>
                                        {displayTarget(alert.url)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {safeHostname(alert.url)} - {new Date(alert.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="warning">Score {alert.risk_score}</Badge>
                                    <Badge variant={alertStatusVariant(alert.status)}>{alertStatusLabel(alert.status)}</Badge>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </section>

            {stats?.threat_distribution?.length ? (
                <section className="panel p-4">
                    <h3 className="mb-3 font-display text-lg font-semibold">Distribution des menaces</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {stats.threat_distribution.map((entry) => (
                            <div key={entry.name} className="metric flex items-center justify-between">
                                <span className="text-sm">{entry.name}</span>
                                <span className="text-sm font-semibold">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
