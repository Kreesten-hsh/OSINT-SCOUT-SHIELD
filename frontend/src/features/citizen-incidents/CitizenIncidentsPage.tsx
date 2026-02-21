import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { FileText, Loader2, Search, Trash2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import type { CitizenIncidentListData, CitizenIncidentListItem } from '@/types';
import { alertStatusLabel, alertStatusVariant, channelLabel } from '@/lib/presentation';

const PAGE_SIZE = 10;

type ApiErrorPayload = { message?: string; detail?: string };

interface GeneratedReportData {
    uuid: string;
}

interface IncidentDeleteData {
    alert_uuid: string;
    deleted_reports_count: number;
    deleted_evidences_count: number;
}

interface CitizenTopNumbersData {
    top_numbers: Array<{
        phone: string;
        count: number;
    }>;
}

export default function CitizenIncidentsPage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);
    const [deletingIncidentId, setDeletingIncidentId] = useState<string | null>(null);
    const [confirmDeleteIncidentId, setConfirmDeleteIncidentId] = useState<string | null>(null);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['citizen-incidents', page, search, status],
        queryFn: async () => {
            const params = new URLSearchParams({
                skip: ((page - 1) * PAGE_SIZE).toString(),
                limit: PAGE_SIZE.toString(),
            });
            if (search.trim()) params.append('q', search.trim());
            if (status) params.append('status', status);

            const response = await apiClient.get<APIResponse<CitizenIncidentListData>>(`/incidents/citizen?${params.toString()}`);
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Erreur chargement incidents citoyens');
            }
            return response.data.data;
        },
    });
    const { data: topNumbersData, isLoading: isTopNumbersLoading } = useQuery({
        queryKey: ['citizen-incidents', 'top-numbers'],
        queryFn: async () => {
            const response = await apiClient.get<APIResponse<CitizenTopNumbersData>>(
                '/incidents/citizen/stats/top-numbers?limit=5',
            );
            return response.data.data?.top_numbers ?? [];
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

    const deleteIncidentMutation = useMutation<
        APIResponse<IncidentDeleteData>,
        AxiosError<ApiErrorPayload>,
        { incidentId: string }
    >({
        mutationFn: async ({ incidentId }) => {
            const response = await apiClient.delete<APIResponse<IncidentDeleteData>>(`/incidents/citizen/${incidentId}`);
            return response.data;
        },
        onSuccess: (payload) => {
            if (!payload.success || !payload.data) {
                toast({
                    title: 'Erreur suppression',
                    description: payload.message || 'Impossible de supprimer ce signalement.',
                    variant: 'destructive',
                });
                return;
            }
            queryClient.invalidateQueries({ queryKey: ['citizen-incidents'] });
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            queryClient.invalidateQueries({ queryKey: ['reports-list'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast({
                title: 'Signalement supprime',
                description: 'Incident, preuves et rapports associes supprimes.',
            });
        },
        onError: (err) => {
            const msg = err.response?.data?.message || err.response?.data?.detail || 'Impossible de supprimer ce signalement.';
            toast({ title: 'Erreur suppression', description: msg, variant: 'destructive' });
        },
        onSettled: () => {
            setDeletingIncidentId(null);
            setConfirmDeleteIncidentId(null);
        },
    });

    const hasNextPage = !!data && data.skip + data.items.length < data.total;
    const topNumbers = topNumbersData ?? [];

    const summary = useMemo(() => {
        const items = data?.items ?? [];
        if (items.length === 0) {
            return { total: data?.total ?? 0, highRisk: 0 };
        }

        return {
            total: data?.total ?? items.length,
            highRisk: items.filter((item) => item.risk_score >= 70).length,
        };
    }, [data]);

    const handleConfirmDeleteIncident = () => {
        if (!confirmDeleteIncidentId) return;
        setDeletingIncidentId(confirmDeleteIncidentId);
        deleteIncidentMutation.mutate({ incidentId: confirmDeleteIncidentId });
    };

    return (
        <div className="space-y-5">
            <section className="panel p-5 fade-rise-in">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="section-title text-2xl">Incidents signales</h2>
                        <p className="section-subtitle">
                            Dossiers citoyens pour revue SOC, decisions et generation probatoire.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="metric">
                            <span className="text-muted-foreground">Total: </span>
                            <span className="font-semibold">{summary.total}</span>
                        </div>
                        <div className="metric">
                            <span className="text-muted-foreground">Haut risque: </span>
                            <span className="font-semibold text-red-300">{summary.highRisk}</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="panel p-4 fade-rise-in-1">
                <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="relative w-full sm:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Rechercher numero, message ou URL"
                            className="h-10 w-full rounded-xl border border-input bg-background/70 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                        />
                    </label>

                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            setPage(1);
                        }}
                        className="h-10 rounded-xl border border-input bg-background/70 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                    >
                        <option value="">Tous les statuts</option>
                        <option value="NEW">Nouveau</option>
                        <option value="IN_REVIEW">En revision</option>
                        <option value="CONFIRMED">Confirme</option>
                        <option value="BLOCKED_SIMULATED">Bloque (simule)</option>
                        <option value="DISMISSED">Classe sans suite</option>
                    </select>
                    <button
                        onClick={() => {
                            setSearch('');
                            setStatus('');
                            setPage(1);
                            refetch();
                        }}
                        className="h-10 rounded-xl border border-input px-3 text-sm text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                    >
                        Reinitialiser
                    </button>
                </div>
            </section>

            <section className="panel p-5 fade-rise-in-2">
                <h3 className="section-title">Top 5 numeros les plus signales</h3>
                <p className="section-subtitle">Les numeros sont partiellement masques pour protection des donnees.</p>

                {isTopNumbersLoading ? (
                    <div className="mt-4 space-y-3 animate-pulse">
                        <div className="h-4 w-1/3 rounded bg-secondary/40" />
                        <div className="h-56 rounded-xl bg-secondary/30" />
                    </div>
                ) : topNumbers.length > 0 ? (
                    <div className="mt-4 h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topNumbers}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.20)" />
                                <XAxis dataKey="phone" stroke="#94A3B8" />
                                <YAxis allowDecimals={false} stroke="#94A3B8" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0F172A',
                                        border: '1px solid rgba(148,163,184,0.35)',
                                        borderRadius: '0.75rem',
                                        color: '#E2E8F0',
                                    }}
                                />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {topNumbers.map((entry) => (
                                        <Cell key={entry.phone} fill={entry.count > 5 ? '#EF4444' : '#F59E0B'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p className="mt-4 rounded-xl border border-border/70 bg-background/50 px-3 py-6 text-sm text-muted-foreground">
                        Aucune donnee disponible
                    </p>
                )}
            </section>

            <section className="panel overflow-hidden fade-rise-in-3">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-left text-sm">
                        <thead className="bg-secondary/35 text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Numero</th>
                                <th className="px-4 py-3">Canal</th>
                                <th className="px-4 py-3">Message</th>
                                <th className="px-4 py-3">Risque</th>
                                <th className="px-4 py-3">Statut</th>
                                <th className="px-4 py-3">Captures</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/70">
                            {isLoading && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-14 text-center text-muted-foreground">
                                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                                        Chargement des incidents...
                                    </td>
                                </tr>
                            )}

                            {isError && !isLoading && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-14 text-center text-destructive">
                                        Impossible de charger les incidents signales.
                                    </td>
                                </tr>
                            )}

                            {!isLoading && !isError && data?.items.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-14 text-center text-muted-foreground">
                                        Aucun incident signale pour ce filtre.
                                    </td>
                                </tr>
                            )}

                            {data?.items.map((item: CitizenIncidentListItem) => {
                                const canGenerate = item.status === 'CONFIRMED' || item.status === 'BLOCKED_SIMULATED';
                                return (
                                    <tr key={item.alert_uuid} className="interactive-row bg-card/70 hover:bg-secondary/20">
                                        <td className="px-4 py-3 font-mono text-xs">{item.phone_number}</td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">{channelLabel(item.channel)}</td>
                                        <td className="max-w-[260px] px-4 py-3">
                                            <span className="line-clamp-1 text-sm" title={item.message_preview || ''}>
                                                {item.message_preview || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={item.risk_score >= 80 ? 'text-red-400' : item.risk_score >= 50 ? 'text-amber-300' : 'text-emerald-300'}>
                                                {item.risk_score}/100
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={alertStatusVariant(item.status)}>{alertStatusLabel(item.status)}</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.attachments_count}</td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/incidents-signales/${item.alert_uuid}`}
                                                    className="inline-flex rounded-lg border border-input bg-background/50 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                                                >
                                                    Detail
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setGeneratingFor(item.alert_uuid);
                                                        generateReportMutation.mutate({ alertUuid: item.alert_uuid });
                                                    }}
                                                    disabled={!canGenerate || generateReportMutation.isPending}
                                                    className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-primary/30 bg-primary/12 px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-45"
                                                >
                                                    {generateReportMutation.isPending && generatingFor === item.alert_uuid ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <FileText className="h-3.5 w-3.5" />
                                                    )}
                                                    Rapport
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setConfirmDeleteIncidentId(item.alert_uuid);
                                                    }}
                                                    disabled={deleteIncidentMutation.isPending}
                                                    className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-destructive/35 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-45"
                                                >
                                                    {deleteIncidentMutation.isPending && deletingIncidentId === item.alert_uuid ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                    Supprimer
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col items-center justify-between gap-3 border-t border-border/70 bg-secondary/20 px-4 py-3 text-xs text-muted-foreground sm:flex-row">
                    <span>{data ? `${data.skip + 1}-${data.skip + data.items.length} / ${data.total}` : '0 / 0'}</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                            className="rounded-md border border-input px-2.5 py-1.5 transition hover:bg-secondary/40 disabled:opacity-50"
                        >
                            Precedent
                        </button>
                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={!hasNextPage || isLoading}
                            className="rounded-md border border-input px-2.5 py-1.5 transition hover:bg-secondary/40 disabled:opacity-50"
                        >
                            Suivant
                        </button>
                    </div>
                </div>
            </section>

            <ConfirmDialog
                open={!!confirmDeleteIncidentId}
                title="Confirmer la suppression"
                description="Supprimer ce signalement supprimera aussi les preuves, rapports et fichiers associes. Cette action est irreversible."
                confirmLabel="Supprimer le signalement"
                isLoading={deleteIncidentMutation.isPending}
                onCancel={() => {
                    if (!deleteIncidentMutation.isPending) {
                        setConfirmDeleteIncidentId(null);
                    }
                }}
                onConfirm={handleConfirmDeleteIncident}
            />
        </div>
    );
}
