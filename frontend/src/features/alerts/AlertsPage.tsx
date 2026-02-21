import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { ChevronLeft, ChevronRight, Eye, Loader2, Search, Trash2 } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import type { Alert, AlertStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
    alertStatusLabel,
    alertStatusVariant,
    displayTarget,
    riskSeverity,
    sourceLabel,
} from '@/lib/presentation';

interface AlertsPageProps {
    title?: string;
    scope?: 'me';
    readOnly?: boolean;
}

function isCitizenSource(sourceType: string): boolean {
    return sourceType.startsWith('CITIZEN_');
}

const STATUS_OPTIONS: Array<{ label: string; value: '' | AlertStatus }> = [
    { label: 'Tous les statuts', value: '' },
    { label: 'Nouveau', value: 'NEW' },
    { label: 'En revision', value: 'IN_REVIEW' },
    { label: 'Confirme', value: 'CONFIRMED' },
    { label: 'Classe sans suite', value: 'DISMISSED' },
    { label: 'Bloque (simule)', value: 'BLOCKED_SIMULATED' },
];

export default function AlertsPage({ title = 'Alertes techniques', scope, readOnly = false }: AlertsPageProps) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [deletingUuid, setDeletingUuid] = useState<string | null>(null);
    const [confirmDeleteAlertUuid, setConfirmDeleteAlertUuid] = useState<string | null>(null);

    const statusFilter = (searchParams.get('status') || '') as '' | AlertStatus;
    const pageSize = 10;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['alerts', scope ?? 'all', page, search, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                skip: ((page - 1) * pageSize).toString(),
                limit: pageSize.toString(),
            });
            if (search.trim()) params.append('q', search.trim());
            if (statusFilter) params.append('status', statusFilter);
            if (scope) params.append('scope', scope);

            const response = await apiClient.get<Alert[]>(`/alerts?${params.toString()}`);
            return response.data;
        },
    });

    const columnCount = readOnly ? 6 : 7;

    const hasNextPage = data?.length === pageSize;

    const deleteMutation = useMutation<
        APIResponse<{ alert_uuid: string }>,
        AxiosError<{ message?: string; detail?: string }>,
        string
    >({
        mutationFn: async (alertUuid) => {
            const response = await apiClient.delete<APIResponse<{ alert_uuid: string }>>(`/alerts/${alertUuid}`);
            return response.data;
        },
        onSuccess: (payload) => {
            if (!payload.success) {
                toast({
                    title: 'Suppression impossible',
                    description: payload.message || 'La suppression a echoue.',
                    variant: 'destructive',
                });
                return;
            }
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            queryClient.invalidateQueries({ queryKey: ['citizen-incidents'] });
            queryClient.invalidateQueries({ queryKey: ['reports-list'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast({
                title: 'Dossier supprime',
                description: 'Alerte, preuves et rapports associes ont ete supprimes.',
            });
        },
        onError: (err) => {
            const msg = err.response?.data?.message || err.response?.data?.detail || 'Erreur lors de la suppression.';
            toast({ title: 'Suppression impossible', description: msg, variant: 'destructive' });
        },
        onSettled: () => {
            setDeletingUuid(null);
            setConfirmDeleteAlertUuid(null);
        },
    });

    const handleConfirmDeleteAlert = () => {
        if (!confirmDeleteAlertUuid) return;
        setDeletingUuid(confirmDeleteAlertUuid);
        deleteMutation.mutate(confirmDeleteAlertUuid);
    };

    return (
        <div className="space-y-5">
            <section className="panel p-5 fade-rise-in">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="section-title text-2xl">{title}</h2>
                        <p className="section-subtitle">File technique unifiee des dossiers web et citoyens.</p>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                        <label className="relative w-full sm:w-72">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Rechercher URL, source, score"
                                className="h-10 w-full rounded-xl border border-input bg-background/70 pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                            />
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                const next = e.target.value as '' | AlertStatus;
                                setSearchParams((prev) => {
                                    if (next) prev.set('status', next);
                                    else prev.delete('status');
                                    return prev;
                                });
                                setPage(1);
                            }}
                            className="h-10 rounded-xl border border-input bg-background/70 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value || 'all'} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            <section className="panel overflow-hidden fade-rise-in-1">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-left text-sm">
                        <thead className="bg-secondary/35 text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Severite</th>
                                <th className="px-4 py-3">Cible</th>
                                <th className="px-4 py-3">Source</th>
                                <th className="px-4 py-3">Statut</th>
                                <th className="px-4 py-3">Risque</th>
                                <th className="px-4 py-3">Date</th>
                                {!readOnly && <th className="px-4 py-3 text-right">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/70">
                            {isLoading && (
                                <tr>
                                    <td colSpan={columnCount} className="px-4 py-14 text-center text-muted-foreground">
                                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                                        Chargement des alertes...
                                    </td>
                                </tr>
                            )}

                            {isError && !isLoading && (
                                <tr>
                                    <td colSpan={columnCount} className="px-4 py-14 text-center text-destructive">
                                        Erreur de chargement des alertes.
                                    </td>
                                </tr>
                            )}

                            {!isLoading && !isError && data?.length === 0 && (
                                <tr>
                                    <td colSpan={columnCount} className="px-4 py-14 text-center text-muted-foreground">
                                        Aucun dossier trouve pour ce filtre.
                                    </td>
                                </tr>
                            )}

                            {data?.map((alert) => (
                                <tr key={alert.id} className="interactive-row bg-card/70 hover:bg-secondary/20">
                                    <td className="px-4 py-3">
                                        <Badge variant={riskSeverity(alert.risk_score) === 'CRITICAL' ? 'destructive' : riskSeverity(alert.risk_score) === 'HIGH' ? 'warning' : 'outline'}>
                                            {riskSeverity(alert.risk_score)}
                                        </Badge>
                                    </td>
                                    <td className="max-w-[280px] px-4 py-3">
                                        <span className="line-clamp-1" title={alert.url}>
                                            {displayTarget(alert.url)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">{sourceLabel(alert.source_type)}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant={alertStatusVariant(alert.status)}>{alertStatusLabel(alert.status)}</Badge>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{alert.risk_score}/100</td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString()}</td>
                                    {!readOnly && (
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <Link
                                                    to={isCitizenSource(alert.source_type) ? `/incidents-signales/${alert.uuid}` : `/alerts/${alert.uuid}`}
                                                    className="inline-flex rounded-lg border border-input bg-background/50 p-2 text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setConfirmDeleteAlertUuid(alert.uuid);
                                                    }}
                                                    disabled={deleteMutation.isPending}
                                                    className="inline-flex rounded-lg border border-destructive/35 bg-destructive/10 p-2 text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
                                                >
                                                    {deleteMutation.isPending && deletingUuid === alert.uuid ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-border/70 bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
                    <span>Page {page}</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                            className="rounded-md border border-input p-1.5 transition hover:bg-secondary/40 disabled:opacity-50"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={!hasNextPage || isLoading}
                            className="rounded-md border border-input p-1.5 transition hover:bg-secondary/40 disabled:opacity-50"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </section>

            <ConfirmDialog
                open={!!confirmDeleteAlertUuid}
                title="Confirmer la suppression"
                description="Supprimer ce dossier va aussi supprimer les preuves, rapports et fichiers associes. Cette action est irreversible."
                confirmLabel="Supprimer le dossier"
                isLoading={deleteMutation.isPending}
                onCancel={() => {
                    if (!deleteMutation.isPending) {
                        setConfirmDeleteAlertUuid(null);
                    }
                }}
                onConfirm={handleConfirmDeleteAlert}
            />
        </div>
    );
}
