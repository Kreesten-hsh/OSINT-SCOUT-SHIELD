import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Hash, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';

import { apiClient } from '@/api/client';
import type { Evidence } from '@/types';
import { Badge } from '@/components/ui/badge';

export default function EvidencePage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
    const pageSize = 20;

    const { data: evidences, isLoading, isError } = useQuery({
        queryKey: ['evidences', page, search],
        queryFn: async () => {
            const params = new URLSearchParams({
                skip: ((page - 1) * pageSize).toString(),
                limit: pageSize.toString(),
            });
            const response = await apiClient.get<Evidence[]>(`/evidence?${params.toString()}`);
            return response.data || [];
        },
    });

    const canNext = (evidences?.length ?? 0) >= pageSize;

    const getDownloadUrl = (path: string) => {
        const filename = path.split('/').pop();
        return `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/evidence/file/${filename}`;
    };

    return (
        <div className="space-y-5">
            <section className="panel p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="font-display text-2xl font-semibold tracking-tight">Registre des preuves</h2>
                        <p className="text-sm text-muted-foreground">Inventaire consultable des artefacts collectes et de leur hash d'integrite.</p>
                    </div>
                    <label className="relative w-full sm:w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Rechercher hash ou id"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="h-10 w-full rounded-xl border border-input bg-background/70 py-2 pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                        />
                    </label>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="panel overflow-hidden lg:col-span-2">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="bg-secondary/35 text-xs uppercase tracking-wide text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Fichier</th>
                                    <th className="px-4 py-3">Capture</th>
                                    <th className="px-4 py-3">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/70">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                                            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                                            Chargement des preuves...
                                        </td>
                                    </tr>
                                ) : isError ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-12 text-center text-destructive">
                                            Erreur de chargement des preuves.
                                        </td>
                                    </tr>
                                ) : evidences?.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                                            Aucune preuve disponible.
                                        </td>
                                    </tr>
                                ) : (
                                    (evidences ?? []).map((ev) => (
                                        <tr
                                            key={ev.id}
                                            className={`cursor-pointer transition hover:bg-secondary/20 ${selectedEvidence?.id === ev.id ? 'bg-primary/5' : 'bg-card/70'}`}
                                            onClick={() => setSelectedEvidence(ev)}
                                        >
                                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{ev.id}</td>
                                            <td className="max-w-[240px] px-4 py-3">
                                                <p className="line-clamp-1 text-sm" title={ev.file_path}>
                                                    {ev.file_path?.split('/').pop() || 'unknown'}
                                                </p>
                                                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{ev.file_hash?.slice(0, 10)}...</p>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {ev.captured_at ? format(new Date(ev.captured_at), 'dd/MM/yy HH:mm') : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={ev.status === 'SEALED' ? 'warning' : 'outline'}>
                                                    {ev.status === 'SEALED' ? 'Scellee' : 'Active'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/70 bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
                        <span>Page {page}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-input px-2.5 py-1.5 disabled:opacity-50">
                                Precedent
                            </button>
                            <button onClick={() => setPage((p) => p + 1)} disabled={!canNext} className="rounded-md border border-input px-2.5 py-1.5 disabled:opacity-50">
                                Suivant
                            </button>
                        </div>
                    </div>
                </div>

                <div className="panel p-4">
                    {selectedEvidence ? (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-display text-lg font-semibold">Preuve #{selectedEvidence.id}</h3>
                                <p className="text-xs text-muted-foreground">Detail integrity + telechargement</p>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-border bg-secondary/20">
                                <img
                                    src={getDownloadUrl(selectedEvidence.file_path)}
                                    alt="Apercu evidence"
                                    className="max-h-56 w-full object-contain"
                                    onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="metric">
                                    <p className="mb-1 inline-flex items-center gap-1 text-muted-foreground">
                                        <Hash className="h-3.5 w-3.5" /> Hash SHA-256
                                    </p>
                                    <p className="break-all font-mono">{selectedEvidence.file_hash}</p>
                                </div>
                                <div className="metric">
                                    <p className="mb-1 text-muted-foreground">Chemin evidence</p>
                                    <p className="break-all font-mono">{selectedEvidence.file_path}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => window.open(getDownloadUrl(selectedEvidence.file_path || ''), '_blank')}
                                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                            >
                                <Download className="h-4 w-4" /> Telecharger l'original
                            </button>
                        </div>
                    ) : (
                        <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/10 p-4 text-center text-muted-foreground">
                            <FileText className="mb-2 h-8 w-8" />
                            <p className="text-sm">Selectionnez une preuve pour afficher le detail.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
