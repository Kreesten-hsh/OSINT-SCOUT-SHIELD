import { useState } from 'react';
import { type AxiosError } from 'axios';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Globe, Link as LinkIcon, Loader2, Shield } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import type { Alert } from '@/types';
import { cn } from '@/lib/utils';

type ApiErrorPayload = { message?: string; detail?: string };

export default function IngestionPage() {
    const navigate = useNavigate();
    const [sourceType, setSourceType] = useState<'WEB' | 'SOCIAL' | 'DARKWEB'>('WEB');
    const [url, setUrl] = useState('');
    const [notes, setNotes] = useState('');

    const mutation = useMutation<
        APIResponse<Alert>,
        AxiosError<ApiErrorPayload>,
        { url: string; source_type: string; notes?: string }
    >({
        mutationFn: async (data) => {
            const response = await apiClient.post<APIResponse<Alert>>('/ingestion/manual', data);
            return response.data;
        },
        onSuccess: (response) => {
            if (response.success && response.data?.uuid) {
                navigate(`/alerts/${response.data.uuid}`);
                return;
            }
            navigate('/alerts');
        },
        onError: (err) => {
            console.error('Ingestion error', err);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;
        mutation.mutate({ url: url.trim(), source_type: sourceType, notes });
    };

    const errorMessage = mutation.error?.response?.data?.message
        || mutation.error?.response?.data?.detail
        || "Echec de l'ingestion : verifiez l'URL ou la connexion backend.";

    return (
        <div className="mx-auto max-w-4xl animate-in space-y-8 fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
                    <Shield className="h-8 w-8 text-primary" />
                    Ingestion de cible
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Injectez une nouvelle source dans le moteur de renseignement pour analyse immediate.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div
                    onClick={() => setSourceType('WEB')}
                    className={cn(
                        'cursor-pointer rounded-xl border p-6 transition-all duration-300 hover:bg-secondary/20',
                        sourceType === 'WEB' ? 'border-primary bg-primary/5 ring-1 ring-primary/50' : 'border-border bg-card'
                    )}
                >
                    <div className="flex flex-col items-center justify-center gap-3">
                        <Globe className={cn('h-8 w-8', sourceType === 'WEB' ? 'text-primary' : 'text-muted-foreground')} />
                        <span className="text-sm font-semibold">Site Web / URL</span>
                    </div>
                </div>

                <div
                    onClick={() => setSourceType('SOCIAL')}
                    className={cn(
                        'cursor-pointer rounded-xl border p-6 transition-all duration-300 hover:bg-secondary/20',
                        sourceType === 'SOCIAL' ? 'border-primary bg-primary/5 ring-1 ring-primary/50' : 'border-border bg-card'
                    )}
                >
                    <div className="flex flex-col items-center justify-center gap-3">
                        <div className="relative">
                            <ArrowRight className="absolute h-8 w-8 rotate-45 text-muted-foreground opacity-50" />
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-current font-bold">@</div>
                        </div>
                        <span className="text-sm font-semibold">Reseaux Sociaux</span>
                    </div>
                </div>

                <div
                    onClick={() => setSourceType('DARKWEB')}
                    className={cn(
                        'cursor-pointer rounded-xl border p-6 transition-all duration-300 hover:bg-secondary/20',
                        sourceType === 'DARKWEB' ? 'border-primary bg-primary/5 ring-1 ring-primary/50' : 'border-border bg-card'
                    )}
                >
                    <div className="flex flex-col items-center justify-center gap-3">
                        <Shield className={cn('h-8 w-8', sourceType === 'DARKWEB' ? 'text-destructive' : 'text-muted-foreground')} />
                        <span className="text-sm font-semibold">Dark Web / Onion</span>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <label className="flex items-center gap-2 text-sm font-medium leading-none">
                            <LinkIcon className="h-4 w-4 text-primary" />
                            URL cible
                        </label>
                        <div className="group relative">
                            <input
                                type="url"
                                required
                                placeholder="https://exemple.com/suspect"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            />
                            <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-primary/20 transition-all group-hover:ring-primary/40" />
                        </div>
                        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                            Le systeme lancera automatiquement les crawlers Playwright.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-medium leading-none">Notes de l&apos;analyste (optionnel)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Contexte initial, hypotheses, vecteurs de menace presumés..."
                            className="flex min-h-[80px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                    </div>

                    {mutation.isError && (
                        <div className="animate-in slide-in-from-top-2 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-destructive">
                            <div className="flex items-center gap-3 text-sm font-medium">
                                <AlertTriangle className="h-5 w-5" />
                                {errorMessage}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={mutation.isPending || !url.trim()}
                            className={cn(
                                'inline-flex h-11 w-full items-center justify-center rounded-md px-8 py-2 text-sm font-medium transition-colors sm:w-auto',
                                'bg-primary text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50'
                            )}
                        >
                            {mutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Initialisation...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Lancer l&apos;ingestion
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 gap-4 text-xs text-muted-foreground md:grid-cols-2">
                <div className="rounded-lg border border-dashed border-border bg-secondary/10 p-4">
                    <h4 className="mb-2 font-semibold text-foreground">Flux de traitement</h4>
                    <ul className="list-disc space-y-1 pl-4">
                        <li>Validation de l&apos;URL et verification DNS.</li>
                        <li>Capture DOM via Playwright (headless browser).</li>
                        <li>Extraction des entites (noms, lieux, crypto).</li>
                        <li>Archivage de la preuve (screenshot SHA-256).</li>
                    </ul>
                </div>
                <div className="rounded-lg border border-dashed border-border bg-secondary/10 p-4">
                    <h4 className="mb-2 font-semibold text-foreground">Confidentialite & OpSec</h4>
                    <p>
                        L&apos;ingestion utilise une rotation de user-agents et de proxys (si configure).
                        Les metadonnees locales de l&apos;analyste ne sont pas transmises a la cible.
                    </p>
                </div>
            </div>
        </div>
    );
}
