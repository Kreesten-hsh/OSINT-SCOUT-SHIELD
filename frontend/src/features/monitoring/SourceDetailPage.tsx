import type { SVGProps } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';

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
        queryFn: monitoringService.getAll,
    });

    const source = sources?.find((s: MonitoringSource) => s.id === sourceId);
    if (!source && !runsLoading) return <div className="p-6">Source non trouvee</div>;

    return (
        <div className="space-y-6">
            <Link to="/monitoring" className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Retour a la surveillance
            </Link>

            <div className="flex flex-col gap-4 border-b border-border pb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                            {source?.name}
                            {source && <Badge variant={source.is_active ? 'default' : 'secondary'}>{source.is_active ? 'Actif' : 'Inactif'}</Badge>}
                        </h1>
                        <a href={source?.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-muted-foreground hover:underline">
                            {source?.url}
                        </a>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-medium text-muted-foreground">Frequence</div>
                        <div className="text-lg font-bold">Every {source?.frequency_minutes} min</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <ActivityIcon className="h-4 w-4" />
                        Total executions
                    </div>
                    <div className="text-2xl font-bold">{runs?.length || 0}</div>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Historique d&apos;execution</h2>
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4">Duree</th>
                                <th className="px-6 py-4">Alertes</th>
                                <th className="px-6 py-4">Message</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {runsLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                                        Chargement de l&apos;historique...
                                    </td>
                                </tr>
                            ) : runs?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                        Aucun historique disponible.
                                    </td>
                                </tr>
                            ) : (
                                runs?.map((run: ScrapingRun) => (
                                    <tr key={run.uuid} className="transition-colors hover:bg-secondary/30">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{new Date(run.started_at).toLocaleDateString()}</span>
                                                <span className="text-xs text-muted-foreground">{new Date(run.started_at).toLocaleTimeString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={run.status === 'COMPLETED' ? 'success' : run.status === 'FAILED' ? 'destructive' : 'secondary'}>
                                                {run.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                                            {run.completed_at
                                                ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {run.alerts_generated_count > 0 ? (
                                                <Badge variant="destructive" className="gap-1">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    {run.alerts_generated_count}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="max-w-xs truncate px-6 py-4 text-muted-foreground" title={run.log_message || ''}>
                                            {run.log_message || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function ActivityIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    );
}
