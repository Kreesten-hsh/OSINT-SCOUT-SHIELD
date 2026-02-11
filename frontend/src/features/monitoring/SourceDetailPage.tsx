import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { monitoringService, ScrapingRun, MonitoringSource } from '@/services/monitoringService';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function SourceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const sourceId = parseInt(id || '0');

    const { data: runs, isLoading: runsLoading } = useQuery({
        queryKey: ['sourceRuns', sourceId],
        queryFn: () => monitoringService.getRuns(sourceId),
        enabled: !!sourceId
    });

    const { data: sources } = useQuery({
        queryKey: ['sources'],
        queryFn: monitoringService.getAll
    });

    const source = sources?.find((s: MonitoringSource) => s.id === sourceId);

    if (!source && !runsLoading) return <div className="p-6">Source non trouvÃ©e</div>;

    return (
        <div className="space-y-6">
            <Link to="/monitoring" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Retour Ã  la surveillance
            </Link>

            <div className="flex flex-col gap-4 border-b border-border pb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                            {source?.name}
                            {source && (
                                <Badge variant={source?.is_active ? 'default' : 'secondary'}>
                                    {source?.is_active ? 'Actif' : 'Inactif'}
                                </Badge>
                            )}
                        </h1>
                        <a href={source?.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:underline text-sm mt-1 block">
                            {source?.url}
                        </a>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-medium text-muted-foreground">FrÃ©quence</div>
                        <div className="text-lg font-bold">Every {source?.frequency_minutes} min</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <ActivityIcon className="w-4 h-4" />
                        Total Executions
                    </div>
                    <div className="text-2xl font-bold">{runs?.length || 0}</div>
                </div>
                {/* Add more stats if needed */}
            </div>

            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Historique d'exÃ©cution</h2>

                <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4">DurÃ©e</th>
                                <th className="px-6 py-4">Alertes</th>
                                <th className="px-6 py-4">Message</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {runsLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                        Chargement de l'historique...
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
                                    <tr key={run.uuid} className="hover:bg-secondary/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{new Date(run.started_at).toLocaleDateString()}</span>
                                                <span className="text-xs text-muted-foreground">{new Date(run.started_at).toLocaleTimeString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={
                                                run.status === 'COMPLETED' ? 'success' :
                                                    run.status === 'FAILED' ? 'destructive' : 'secondary'
                                            }>
                                                {run.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground text-xs font-mono">
                                            {run.completed_at ? (
                                                `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {run.alerts_generated_count > 0 ? (
                                                <Badge variant="destructive" className="gap-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {run.alerts_generated_count}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground max-w-xs truncate" title={run.log_message || ''}>
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

function ActivityIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}

