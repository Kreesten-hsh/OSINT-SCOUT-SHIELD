import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import {
    AlertTriangle,
    Clock3,
    FileText,
    Globe,
    Image as ImageIcon,
    Loader2,
    Search,
    Smartphone,
    TrendingUp,
} from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import type { CitizenIncidentListData, CitizenIncidentListItem } from '@/types';

const PAGE_SIZE = 10;

type IncidentStatus = CitizenIncidentListItem['status'];
type ApiErrorPayload = { message?: string; detail?: string };

interface GeneratedReportData {
    uuid: string;
}

const STATUS_LABEL: Record<IncidentStatus, string> = {
    NEW: 'Nouveau',
    IN_REVIEW: 'En revision',
    CONFIRMED: 'Confirme',
    DISMISSED: 'Classe sans suite',
    BLOCKED_SIMULATED: 'Bloque simule',
};

const CHANNEL_LABEL: Record<CitizenIncidentListItem['channel'], string> = {
    MOBILE_APP: 'Mobile',
    WEB_PORTAL: 'Web',
};

function statusBadgeVariant(status: IncidentStatus): 'outline' | 'default' | 'destructive' | 'success' | 'warning' {
    if (status === 'BLOCKED_SIMULATED') return 'success';
    if (status === 'CONFIRMED') return 'destructive';
    if (status === 'IN_REVIEW') return 'warning';
    if (status === 'DISMISSED') return 'outline';
    return 'default';
}

function riskTone(score: number): string {
    if (score >= 80) return 'text-red-400';
    if (score >= 50) return 'text-amber-300';
    return 'text-emerald-300';
}

function riskBar(score: number): string {
    if (score >= 80) return 'bg-red-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-emerald-500';
}

export default function CitizenIncidentsPage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['citizen-incidents', page, search, status],
        queryFn: async () => {
            const params = new URLSearchParams({
                skip: ((page - 1) * PAGE_SIZE).toString(),
                limit: PAGE_SIZE.toString(),
            });
            if (search.trim()) params.append('q', search.trim());
            if (status) params.append('status', status);

            const response = await apiClient.get<APIResponse<CitizenIncidentListData>>(
                `/incidents/citizen?${params.toString()}`
            );
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Erreur chargement incidents citoyens');
            }
            return response.data.data;
        },
    });

    const generateReportMutation = useMutation<
        APIResponse<GeneratedReportData>,
        AxiosError<ApiErrorPayload>,
        { alertUuid: string }
    >({
        mutationFn: async ({ alertUuid }) => {
            const response = await apiClient.post<APIResponse<GeneratedReportData>>(`/reports/generate/${alertUuid}`);
            return response.data;
        },
        onSuccess: (payload) => {
            if (!payload.success || !payload.data) {
                toast({
                    title: 'Erreur generation rapport',
                    description: payload.message || 'Impossible de generer le rapport.',
                    variant: 'destructive',
                });
                return;
            }

            queryClient.invalidateQueries({ queryKey: ['reports-list'] });
            toast({
                title: 'Rapport genere',
                description: 'Le rapport est disponible dans la section Rapports.',
            });
        },
        onError: (err) => {
            const msg = err.response?.data?.message || err.response?.data?.detail || 'Impossible de generer le rapport.';
            toast({ title: 'Erreur generation rapport', description: msg, variant: 'destructive' });
        },
        onSettled: () => {
            setGeneratingFor(null);
        },
    });

    const hasNextPage = !!data && data.skip + data.items.length < data.total;

    const summary = useMemo(() => {
        const items = data?.items ?? [];
        if (items.length === 0) {
            return {
                total: data?.total ?? 0,
                avgRisk: 0,
                highRisk: 0,
                withAttachments: 0,
            };
        }

        const totalRisk = items.reduce((acc, item) => acc + item.risk_score, 0);
        return {
            total: data?.total ?? items.length,
            avgRisk: Math.round(totalRisk / items.length),
            highRisk: items.filter((item) => item.risk_score >= 70).length,
            withAttachments: items.filter((item) => item.attachments_count > 0).length,
        };
    }, [data]);

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/10 p-6">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative z-10">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.24em] text-primary/90">BENIN CYBER SHIELD</p>
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Incidents signales</h1>
                            <p className="max-w-2xl text-sm text-muted-foreground">
                                Liste operationnelle des signalements citoyens avec action rapide de generation de rapport.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-xl border border-border/80 bg-background/60 px-4 py-3 backdrop-blur">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
                                <p className="text-xl font-semibold">{summary.total}</p>
                            </div>
                            <div className="rounded-xl border border-border/80 bg-background/60 px-4 py-3 backdrop-blur">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Score moyen</p>
                                <p className={`text-xl font-semibold ${riskTone(summary.avgRisk)}`}>{summary.avgRisk}</p>
                            </div>
                            <div className="rounded-xl border border-border/80 bg-background/60 px-4 py-3 backdrop-blur">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Haut risque</p>
                                <p className="text-xl font-semibold text-red-300">{summary.highRisk}</p>
                            </div>
                            <div className="rounded-xl border border-border/80 bg-background/60 px-4 py-3 backdrop-blur">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Avec preuves</p>
                                <p className="text-xl font-semibold text-emerald-300">{summary.withAttachments}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-border bg-card/80 p-4 backdrop-blur">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Rechercher numero, message ou URL"
                            className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                        <select
                            value={status}
                            onChange={(e) => {
                                setStatus(e.target.value);
                                setPage(1);
                            }}
                            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                        >
                            <option value="">Tous les statuts</option>
                            <option value="NEW">Nouveau</option>
                            <option value="IN_REVIEW">En revision</option>
                            <option value="CONFIRMED">Confirme</option>
                            <option value="BLOCKED_SIMULATED">Bloque simule</option>
                            <option value="DISMISSED">Classe sans suite</option>
                        </select>
                        <button
                            onClick={() => {
                                setSearch('');
                                setStatus('');
                                setPage(1);
                                refetch();
                            }}
                            className="rounded-xl border border-input px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                        >
                            Reinitialiser
                        </button>
                    </div>
                </div>
            </section>

            <section className="space-y-3">
                {isLoading && (
                    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement des incidents...
                    </div>
                )}

                {isError && !isLoading && (
                    <div className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-8 text-center text-sm text-destructive">
                        Impossible de charger les incidents signales.
                    </div>
                )}

                {!isLoading && !isError && data?.items.length === 0 && (
                    <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                        Aucun incident signale pour ce filtre.
                    </div>
                )}

                {data?.items.map((item) => {
                    const canGenerate = item.status === 'CONFIRMED' || item.status === 'BLOCKED_SIMULATED';

                    return (
                        <article
                            key={item.alert_uuid}
                            className="overflow-hidden rounded-2xl border border-border bg-card/90 p-5 transition duration-200 hover:border-primary/40 hover:shadow-[0_10px_32px_-16px_rgba(13,147,242,0.5)]"
                        >
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-sm text-foreground/90">{item.phone_number}</span>
                                            <Badge variant="outline" className="gap-1">
                                                {item.channel === 'MOBILE_APP' ? (
                                                    <Smartphone className="h-3.5 w-3.5" />
                                                ) : (
                                                    <Globe className="h-3.5 w-3.5" />
                                                )}
                                                {CHANNEL_LABEL[item.channel]}
                                            </Badge>
                                            <Badge variant={statusBadgeVariant(item.status)}>{STATUS_LABEL[item.status]}</Badge>
                                        </div>
                                        <p className="max-w-3xl text-sm text-muted-foreground">
                                            {item.message_preview || 'Message non fourni'}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Risque</p>
                                        <p className={`text-xl font-semibold ${riskTone(item.risk_score)}`}>{item.risk_score}</p>
                                    </div>
                                </div>

                                <div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary/70">
                                        <div
                                            className={`h-full rounded-full ${riskBar(item.risk_score)}`}
                                            style={{ width: `${Math.min(100, Math.max(0, item.risk_score))}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                                    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/20 px-3 py-2">
                                        <TrendingUp className="h-3.5 w-3.5" />
                                        Rapports numero: <span className="font-semibold text-foreground">{item.reports_for_phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/20 px-3 py-2">
                                        <ImageIcon className="h-3.5 w-3.5" />
                                        Captures: <span className="font-semibold text-foreground">{item.attachments_count}</span>
                                    </div>
                                    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/20 px-3 py-2">
                                        <Clock3 className="h-3.5 w-3.5" />
                                        Incident: <span className="font-mono text-foreground">#{item.alert_uuid.slice(0, 8)}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
                                    <p className="text-xs text-muted-foreground">
                                        {canGenerate
                                            ? 'Incident confirme: generation de rapport disponible.'
                                            : 'Confirme d abord l incident pour activer la generation de rapport.'}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            to={`/incidents-signales/${item.alert_uuid}`}
                                            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-secondary/40"
                                        >
                                            <AlertTriangle className="h-3.5 w-3.5" /> Voir detail
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setGeneratingFor(item.alert_uuid);
                                                generateReportMutation.mutate({ alertUuid: item.alert_uuid });
                                            }}
                                            disabled={!canGenerate || generateReportMutation.isPending}
                                            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {generateReportMutation.isPending && generatingFor === item.alert_uuid ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <FileText className="h-3.5 w-3.5" />
                                            )}
                                            Generer rapport
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </section>

            <section className="flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-card/70 px-4 py-3 text-xs text-muted-foreground sm:flex-row">
                <span>{data ? `${data.skip + 1}-${data.skip + data.items.length} / ${data.total}` : '0 / 0'}</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                        className="rounded-lg border border-input px-3 py-1.5 transition hover:bg-secondary/40 disabled:opacity-50"
                    >
                        Precedent
                    </button>
                    <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!hasNextPage || isLoading}
                        className="rounded-lg border border-input px-3 py-1.5 transition hover:bg-secondary/40 disabled:opacity-50"
                    >
                        Suivant
                    </button>
                </div>
            </section>
        </div>
    );
}
