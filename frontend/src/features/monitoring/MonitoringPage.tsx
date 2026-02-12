import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monitoringService, MonitoringSource } from '@/services/monitoringService';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Globe, RefreshCw, Power, PowerOff, List } from 'lucide-react';
import AddSourceDialog from './AddSourceDialog';
import { Link } from 'react-router-dom';

export default function MonitoringPage() {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);

    const { data: sources, isLoading, isError } = useQuery({
        queryKey: ['sources'],
        queryFn: monitoringService.getAll
    });

    const toggleMutation = useMutation({
        mutationFn: monitoringService.toggle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sources'] });
        }
    });

    const handleToggle = (id: number) => {
        toggleMutation.mutate(id);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Surveillance Automatique</h1>
                    <p className="text-muted-foreground text-sm">Gérez les robots de collecte et les fréquences d'analyse.</p>
                </div>
                <button
                    onClick={() => setIsAddOpen(true)}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 transition-colors gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Ajouter une source
                </button>
            </div>

            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Nom / URL</th>
                                <th className="px-6 py-4">Fréquence</th>
                                <th className="px-6 py-4">Dernier Scan</th>
                                <th className="px-6 py-4">Dernier Statut</th>
                                <th className="px-6 py-4">État</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Chargement des sources...
                                        </div>
                                    </td>
                                </tr>
                            ) : isError ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-destructive">
                                        Impossible de charger les sources. Vérifiez la connexion API.
                                    </td>
                                </tr>
                            ) : sources?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        Aucune source configurée. Ajoutez-en une pour démarrer la surveillance.
                                    </td>
                                </tr>
                            ) : (
                                sources?.map((source: MonitoringSource) => (
                                    <tr key={source.id} className={`hover:bg-secondary/30 transition-colors ${!source.is_active ? 'opacity-60 bg-secondary/10' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-full bg-secondary text-primary">
                                                    <Globe className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground">{source.name}</span>
                                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={source.url}>{source.url}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <RefreshCw className="w-3 h-3" />
                                                {source.frequency_minutes >= 60
                                                    ? `${source.frequency_minutes / 60}h`
                                                    : `${source.frequency_minutes}min`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                            {source.last_run_at ? (
                                                <div className="flex flex-col">
                                                    <span>{new Date(source.last_run_at).toLocaleDateString()}</span>
                                                    <span className="text-xs opacity-70">{new Date(source.last_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs italic">Jamais</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={
                                                source.last_status === 'ALERT' ? 'destructive' :
                                                    source.last_status === 'CLEAN' ? 'success' :
                                                        source.last_status === 'ERROR' ? 'destructive' : 'secondary'
                                            }>
                                                {source.last_status || 'PENDING'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggle(source.id)}
                                                disabled={toggleMutation.isPending}
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${source.is_active
                                                        ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25'
                                                        : 'bg-muted text-muted-foreground hover:bg-secondary'
                                                    }`}
                                            >
                                                {source.is_active ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                                                {source.is_active ? 'Actif' : 'Inactif'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                to={`/monitoring/${source.id}`}
                                                className="inline-flex items-center justify-center p-2 rounded-md hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground"
                                                title="Voir historique"
                                            >
                                                <List className="w-4 h-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddSourceDialog
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['sources'] });
                }}
            />
        </div>
    );
}

