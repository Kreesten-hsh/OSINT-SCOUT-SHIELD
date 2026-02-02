import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Alert } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

interface AlertsPageProps {
    title?: string;
}

export default function AlertsPage({ title = 'Gestion des Alertes' }: AlertsPageProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    // Get filter from URL or default to empty (SHOW ALL)
    const statusFilter = searchParams.get('status') || '';
    const pageSize = 10;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['alerts', page, search, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                skip: ((page - 1) * pageSize).toString(),
                limit: pageSize.toString(),
            });
            if (search) params.append('q', search);
            if (statusFilter) params.append('status', statusFilter);

            const response = await apiClient.get<Alert[]>('/alerts?' + params.toString());
            // Backend returns array directly based on current implementation
            return response.data;
        }
    });

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        setSearchParams(prev => {
            if (newStatus) {
                prev.set('status', newStatus);
            } else {
                prev.delete('status');
            }
            return prev;
        });
        setPage(1); // Reset to first page on filter change
    };

    // Simple hasNextPage logic
    const hasNextPage = data?.length === pageSize;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Filtrer..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-card border border-input rounded-md py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={handleStatusChange}
                        className="p-2 border border-input bg-card rounded-md hover:bg-secondary transition-colors text-sm outline-none focus:ring-1 focus:ring-primary"
                    >
                        <option value="">Tous les statuts</option>
                        <option value="NEW">Nouveau</option>
                        <option value="IN_REVIEW">En révision</option>
                        <option value="CONFIRMED">Confirmé</option>
                        <option value="DISMISSED">Classé sans suite</option>
                    </select>
                </div>
            </div>

            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Sévérité</th>
                                <th className="px-6 py-4">Source / URL</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4">Score</th>
                                <th className="px-6 py-4">Détecté le</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Chargement des alertes...
                                        </div>
                                    </td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-destructive">
                                        Erreur de chargement des données.
                                    </td>
                                </tr>
                            ) : data?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        Aucune alerte trouvée.
                                    </td>
                                </tr>
                            ) : (
                                data?.map((alert: Alert) => (
                                    <tr key={alert.id} className="hover:bg-secondary/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <Badge variant={
                                                alert.severity === 'CRITICAL' ? 'destructive' :
                                                    alert.severity === 'HIGH' ? 'warning' : 'secondary'
                                            }>
                                                {alert.severity}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 max-w-[300px]">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground truncate " title={alert.url}>{alert.url}</span>
                                                <span className="text-xs text-muted-foreground">{alert.source_type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={
                                                alert.status === 'NEW' ? 'outline' :
                                                    alert.status === 'IN_REVIEW' ? 'default' :
                                                        alert.status === 'CONFIRMED' ? 'destructive' : 'secondary'
                                            }>
                                                {alert.status === 'IN_REVIEW' ? 'EN RÉVISION' : alert.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-muted-foreground">
                                            {alert.risk_score}/100
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                            {new Date(alert.created_at).toLocaleDateString()} <span className="text-xs opacity-50">{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link to={`/alerts/${alert.uuid}`} className="inline-flex items-center justify-center p-2 rounded-md hover:bg-primary/20 hover:text-primary transition-colors">
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-secondary/20">
                    <span className="text-xs text-muted-foreground">Page {page}</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                            className="p-1.5 rounded-md hover:bg-secondary disabled:opacity-50 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={!hasNextPage || isLoading}
                            className="p-1.5 rounded-md hover:bg-secondary disabled:opacity-50 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
