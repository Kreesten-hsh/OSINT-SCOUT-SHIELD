import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Clock3, Loader2, Waves } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { monitoringService, type MonitoringSource, type ScrapingRun } from '@/services/monitoringService';

export default function SourceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const sourceId = Number.parseInt(id || '0', 10);

    const { data: runs, isLoading: runsLoading } = useQuery({
        queryKey: ['sourceRuns', sourceId],
        queryFn: () => monitoringService.getRuns(sourceId),
        enabled: !!sourceId,
    });

    const { data: sources } = useQuery({
        queryKey: ['sources'],
        queryFn: () => monitoringService.getAll(),
    });

    const source = sources?.find((s: MonitoringSource) => s.id === sourceId);
    if (!source && !runsLoading) return <div className="p-6">Source non trouvee</div>;

    return (
        <div className="space-y-5">
            <Link to="/monitoring" className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Retour a la surveillance
            </Link>

            <section className="panel p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="font-display text-2xl font-semibold tracking-tight">{source?.name}</h2>
                        <a href={source?.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-muted-foreground hover:underline">
                            {source?.url}
                        </a>
                    </div>
                    <div className="flex items-center gap-2">
                        {source && <Badge variant={source.is_active ? 'success' : 'secondary'}>{source.is_active ? 'Actif' : 'Inactif'}</Badge>}
                        <div className="metric text-xs">Frequence: chaque {source?.frequency_minutes} min</div>
                    </div>
                </div>
            </section>

            <section className="panel p-4">
                <div className="mb-3 flex items-center gap-2">
                    <Waves className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-lg font-semibold">Historique d'execution</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-secondary/35 text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Statut</th>
                                <th className="px-4 py-3">Duree</th>
                                <th className="px-4 py-3">Alertes</th>
                                <th className="px-4 py-3">Message</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/70">
                            {runsLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                                        Chargement de l'historique...
                                    </td>
                                </tr>
                            ) : runs?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                                        Aucun historique disponible.
                                    </td>
                                </tr>
                            ) : (
                                runs?.map((run: ScrapingRun) => (
                                    <tr key={run.uuid} className="bg-card/70 transition hover:bg-secondary/20">
                                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{new Date(run.started_at).toLocaleString()}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={run.status === 'COMPLETED' ? 'success' : run.status === 'FAILED' ? 'destructive' : 'secondary'}>
                                                {run.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                            {run.completed_at ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock3 className="h-3.5 w-3.5" />
                                                    {Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s
                                                </span>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {run.alerts_generated_count > 0 ? (
                                                <Badge variant="destructive" className="gap-1">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    {run.alerts_generated_count}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="max-w-xs truncate px-4 py-3 text-xs text-muted-foreground" title={run.log_message || ''}>
                                            {run.log_message || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
