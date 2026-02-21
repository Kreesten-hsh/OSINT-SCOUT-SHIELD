import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Globe, List, Loader2, Plus, Power, PowerOff, RefreshCw } from 'lucide-react';

import { monitoringService, MonitoringSource } from '@/services/monitoringService';
import { Badge } from '@/components/ui/badge';
import AddSourceDialog from './AddSourceDialog';

interface MonitoringPageProps {
    scope?: 'me';
    readOnly?: boolean;
}

export default function MonitoringPage({ scope }: MonitoringPageProps) {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);

    const queryKey = ['sources', scope ?? 'all'];

    const { data: sources, isLoading, isError } = useQuery({
        queryKey,
        queryFn: () => monitoringService.getAll(scope),
    });

    const toggleMutation = useMutation({
        mutationFn: monitoringService.toggle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    const handleToggle = (id: number) => {
        toggleMutation.mutate(id);
    };

    return (
        <div className="space-y-5">
            <section className="panel p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="font-display text-2xl font-semibold tracking-tight">Surveillance automatique</h2>
                        <p className="text-sm text-muted-foreground">Gestion des sources monitorees et de la cadence de collecte.</p>
                    </div>
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" /> Ajouter une source
                    </button>
                </div>
            </section>

            <section className="panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-left text-sm">
                        <thead className="bg-secondary/35 text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Source</th>
                                <th className="px-4 py-3">Frequence</th>
                                <th className="px-4 py-3">Dernier run</th>
                                <th className="px-4 py-3">Statut run</th>
                                <th className="px-4 py-3">Etat</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/70">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                                        Chargement des sources...
                                    </td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-destructive">
                                        Impossible de charger les sources.
                                    </td>
                                </tr>
                            ) : sources?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                                        Aucune source configuree.
                                    </td>
                                </tr>
                            ) : (
                                sources?.map((source: MonitoringSource) => (
                                    <tr key={source.id} className="bg-card/70 transition hover:bg-secondary/20">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg border border-border/70 bg-background/60 p-2 text-primary">
                                                    <Globe className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{source.name}</p>
                                                    <p className="max-w-[280px] truncate text-xs text-muted-foreground" title={source.url}>
                                                        {source.url}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            <span className="inline-flex items-center gap-1">
                                                <RefreshCw className="h-3.5 w-3.5" />
                                                {source.frequency_minutes >= 60
                                                    ? `Toutes les ${source.frequency_minutes / 60}h`
                                                    : `Toutes les ${source.frequency_minutes} min`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {source.last_run_at ? new Date(source.last_run_at).toLocaleString() : 'Jamais'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    source.last_status === 'ALERT'
                                                        ? 'destructive'
                                                        : source.last_status === 'CLEAN'
                                                          ? 'success'
                                                          : source.last_status === 'ERROR'
                                                            ? 'destructive'
                                                            : 'secondary'
                                                }
                                            >
                                                {source.last_status || 'PENDING'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleToggle(source.id)}
                                                disabled={toggleMutation.isPending}
                                                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                                                    source.is_active
                                                        ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                                                        : 'bg-muted text-muted-foreground hover:bg-secondary'
                                                }`}
                                            >
                                                {source.is_active ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}
                                                {source.is_active ? 'Actif' : 'Inactif'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                to={`/monitoring/${source.id}`}
                                                className="inline-flex rounded-lg border border-input bg-background/50 p-2 text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                                                title="Voir historique"
                                            >
                                                <List className="h-4 w-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <AddSourceDialog
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey });
                }}
            />
        </div>
    );
}
