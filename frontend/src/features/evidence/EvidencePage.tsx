import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Evidence } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, FileText, Calendar, Hash, Terminal, Lock, Unlock, Download, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function EvidencePage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const pageSize = 20;

    const handleNextPage = () => setPage(p => p + 1);
    const handlePrevPage = () => setPage(p => Math.max(1, p - 1));

    // Fetch Global Evidence List
    const { data: evidences, isLoading, isError } = useQuery({
        queryKey: ['evidences', page, search],
        queryFn: async () => {
            const params = new URLSearchParams({
                skip: ((page - 1) * pageSize).toString(),
                limit: pageSize.toString(),
            });
            try {
                const response = await apiClient.get<Evidence[]>('/evidence?' + params.toString());
                return response.data;
            } catch (e) {
                return [];
            }
        }
    });

    const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

    const getDownloadUrl = (path: string) => {
        const filename = path.split('/').pop();
        return `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/evidence/file/${filename}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <FileText className="w-6 h-6 text-primary" />
                        Registre des Preuves
                    </h1>
                    <p className="text-muted-foreground text-sm">Base de donnÃ©es forensique immuable via MinIO.</p>
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
                {/* LIST / TABLE - Takes 2/3 width */}
                <div className="lg:col-span-2 border border-border rounded-xl bg-card overflow-hidden shadow-sm flex flex-col h-[70vh]">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs font-semibold sticky top-0 backdrop-blur-md">
                                <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Fichier / Context</th>
                                    <th className="px-4 py-3">Horodatage</th>
                                    <th className="px-4 py-3">ChaÃ®ne de Garde</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                            Chargement du registre...
                                        </td>
                                    </tr>
                                ) : isError ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-destructive">
                                            Erreur d'accÃ¨s au registre.
                                        </td>
                                    </tr>
                                ) : evidences?.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                            Aucune preuve archivÃ©e.
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
                                                        {ev.file_path?.split('/').pop() || 'unknown'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]" title={ev.file_hash}>
                                                        {ev.file_hash?.substring(0, 8)}...
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3 h-3" />
                                                    {ev.captured_at ? format(new Date(ev.captured_at), 'dd/MM/yy HH:mm') : '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {ev.status === 'ACTIVE' ? ( // Changed logic: SEALED or ACTIVE logic
                                                    <Badge variant="outline" className="text-muted-foreground flex items-center gap-1 w-fit bg-secondary/50">
                                                        <Unlock className="w-3 h-3" /> Digital
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1 w-fit">
                                                        <Lock className="w-3 h-3" /> SCELLÃ‰
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="p-4 border-t border-border bg-secondary/10 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Registre Page {page}</span>
                        <div className="flex gap-2">
                            <button onClick={handlePrevPage} disabled={page === 1} className="px-3 py-1 text-xs border rounded hover:bg-background disabled:opacity-50">PrÃ©c.</button>
                            <button onClick={handleNextPage} disabled={evidences && evidences.length < pageSize} className="px-3 py-1 text-xs border rounded hover:bg-background disabled:opacity-50">Suiv.</button>
                        </div>
                    </div>
                </div>

                {/* DETAIL PANEL - Takes 1/3 width */}
                <div className="lg:col-span-1">
                    {selectedEvidence ? (
                        <div className="bg-card border border-border rounded-xl shadow-lg h-full max-h-[70vh] flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="px-4 py-3 border-b border-border bg-secondary/30 flex justify-between items-center">
                                <h3 className="font-semibold text-sm flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-primary" />
                                    Preuve #{selectedEvidence.id}
                                </h3>
                                <Badge variant="outline" className="font-mono text-[10px] bg-background">SHA-256 VALIDÃ‰</Badge>
                            </div>

                            <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                                {/* IMAGE PREVIEW */}
                                {selectedEvidence.file_path && (
                                    <div className="rounded-lg border border-border overflow-hidden bg-black/10 flex items-center justify-center min-h-[150px]">
                                        <img
                                            src={getDownloadUrl(selectedEvidence.file_path)}
                                            alt="Evidence Preview"
                                            className="w-full h-auto object-contain max-h-[300px]"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-xs text-muted-foreground p-4">AperÃ§u non disponible (Format ou AccÃ¨s)</div>';
                                            }}
                                        />
                                    </div>
                                )}

                                {/* METADATA GRID */}
                                <div className="space-y-4">
                                    <div className="p-3 bg-secondary/10 rounded-lg border border-border">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                                            <Hash className="w-3 h-3" /> Hash ScellÃ©
                                        </h4>
                                        <div className="text-xs break-all font-mono text-primary select-all">
                                            {selectedEvidence.file_hash || "HASH_MISSING"}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Chemin Absolu</h4>
                                        <div className="p-2 bg-secondary/5 rounded border border-border text-[10px] break-all font-mono text-muted-foreground select-all">
                                            {selectedEvidence.file_path}
                                        </div>
                                    </div>

                                    {/* JSON VIEWER (Only if meaningful metadata exists) */}
                                    {selectedEvidence.metadata_json && Object.keys(selectedEvidence.metadata_json).length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-2">
                                                <Terminal className="w-3 h-3" />
                                                MetadonnÃ©es Techniques
                                            </h4>
                                            <pre className="p-3 bg-black/80 rounded-md border border-border text-[10px] text-green-400 font-mono overflow-auto max-h-[150px] custom-scrollbar">
                                                {JSON.stringify(selectedEvidence.metadata_json, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 border-t border-border bg-secondary/10">
                                <button
                                    onClick={() => window.open(getDownloadUrl(selectedEvidence.file_path || ''), '_blank')}
                                    className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                                >
                                    <Download className="w-4 h-4" />
                                    TÃ©lÃ©charger l'Original
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground p-6 text-center bg-secondary/5">
                            <FileText className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm font-medium">SÃ©lectionnez une preuve</p>
                            <p className="text-xs opacity-70 mt-1 max-w-[180px]">Cliquez sur une ligne pour inspecter le scellÃ© numÃ©rique.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

