import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Evidence } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, FileText, Calendar, Hash, Eye, Terminal } from 'lucide-react';
import { format } from 'date-fns';

export default function EvidencePage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const pageSize = 20;

    // Fetch Global Evidence List
    const { data: evidences, isLoading, isError } = useQuery({
        queryKey: ['evidences', page, search],
        queryFn: async () => {
            const params = new URLSearchParams({
                skip: ((page - 1) * pageSize).toString(),
                limit: pageSize.toString(),
            });
            // if (search) params.append('q', search); // Backend support pending for search

            const response = await apiClient.get<Evidence[]>('/evidence?' + params.toString());
            return response.data;
        }
    });

    const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <FileText className="w-6 h-6 text-primary" />
                        Registre des Preuves
                    </h1>
                    <p className="text-muted-foreground text-sm">Registre forensique de toutes les preuves capturées.</p>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Rechercher (Hash, ID...)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-card border border-input rounded-md py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LIST / TABLE - Takes 2/3 width if panel open */}
                <div className="lg:col-span-2 border border-border rounded-xl bg-card overflow-hidden shadow-sm flex flex-col h-[70vh]">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs font-semibold sticky top-0 backdrop-blur-md">
                                <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Fichier / Hash</th>
                                    <th className="px-4 py-3">Capturé le</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                            Chargement des preuves...
                                        </td>
                                    </tr>
                                ) : isError ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-destructive">
                                            Erreur de chargement.
                                        </td>
                                    </tr>
                                ) : evidences?.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                            Aucune preuve archivée.
                                        </td>
                                    </tr>
                                ) : (
                                    evidences?.map((ev) => (
                                        <tr
                                            key={ev.id}
                                            className={`hover:bg-secondary/30 transition-colors cursor-pointer ${selectedEvidence?.id === ev.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                                            onClick={() => setSelectedEvidence(ev)}
                                        >
                                            <td className="px-4 py-3 font-mono text-muted-foreground">#{ev.id}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-medium truncate max-w-[200px]" title={ev.file_path}>
                                                        {ev.file_path?.split('/').pop() || 'unknown_file'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]" title={ev.file_hash}>
                                                        {ev.file_hash?.substring(0, 12)}...
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3 h-3" />
                                                    {ev.captured_at ? format(new Date(ev.captured_at), 'dd/MM HH:mm') : '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button className="p-2 hover:bg-secondary rounded-full">
                                                    <Eye className="w-4 h-4 text-primary" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* DETAIL PANEL - Takes 1/3 width */}
                <div className="lg:col-span-1">
                    {selectedEvidence ? (
                        <div className="bg-card border border-border rounded-xl shadow-lg h-full max-h-[70vh] flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="px-4 py-3 border-b border-border bg-secondary/30 flex justify-between items-center">
                                <h3 className="font-semibold text-sm">Preuve #{selectedEvidence.id}</h3>
                                <Badge variant="outline" className="font-mono text-[10px]">SHA-256</Badge>
                            </div>

                            <div className="p-4 space-y-4 overflow-y-auto flex-1">
                                {/* METADATA GRID */}
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Chemin Fichier</h4>
                                        <div className="p-2 bg-secondary/10 rounded border border-border text-xs break-all font-mono text-foreground">
                                            {selectedEvidence.file_path}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Empreinte Cryptographique</h4>
                                        <div className="flex items-start gap-2 p-2 bg-secondary/10 rounded border border-border text-xs break-all font-mono text-primary/80">
                                            <Hash className="w-3 h-3 mt-0.5" />
                                            {selectedEvidence.file_hash}
                                        </div>
                                    </div>
                                </div>

                                {/* JSON VIEWER (Simulated) */}
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-2">
                                        <Terminal className="w-3 h-3" />
                                        Metadonnées Techniques
                                    </h4>
                                    <pre className="p-3 bg-black/50 rounded-md border border-border text-[10px] text-green-400 font-mono overflow-auto max-h-[300px]">
                                        {JSON.stringify(selectedEvidence.metadata_json || {}, null, 2)}
                                    </pre>
                                </div>
                            </div>

                            <div className="p-4 border-t border-border bg-secondary/10">
                                <button
                                    onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/evidence/file/${selectedEvidence.file_path?.split('/').pop()}`, '_blank')}
                                    className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    Télécharger Original
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                            <FileText className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm font-medium">Sélectionnez une preuve</p>
                            <p className="text-xs opacity-70">Cliquez sur une ligne pour voir les détails techniques.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
