import { useState } from 'react';
import { type AxiosError } from 'axios';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Globe, Link as LinkIcon, Loader2, RadioTower } from 'lucide-react';

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
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;
        mutation.mutate({ url: url.trim(), source_type: sourceType, notes });
    };

    const errorMessage =
        mutation.error?.response?.data?.message ||
        mutation.error?.response?.data?.detail ||
        "Echec de l'ingestion: verifiez l'URL ou la connexion backend.";

    return (
        <div className="mx-auto max-w-4xl space-y-5">
            <section className="panel p-6">
                <h2 className="font-display text-2xl font-semibold tracking-tight">Ingestion manuelle de cible</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Injecter une URL suspecte dans le pipeline OSINT pour ouverture d'un dossier.
                </p>
            </section>

            <section className="panel p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {[{ key: 'WEB', label: 'Web', icon: Globe }, { key: 'SOCIAL', label: 'Reseaux sociaux', icon: RadioTower }, { key: 'DARKWEB', label: 'Dark web', icon: AlertTriangle }].map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setSourceType(item.key as 'WEB' | 'SOCIAL' | 'DARKWEB')}
                                className={cn(
                                    'flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                                    sourceType === item.key
                                        ? 'border-primary/35 bg-primary/15 text-primary'
                                        : 'border-border/70 bg-background/50 text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <label className="block space-y-1.5 text-sm">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">URL cible</span>
                        <div className="relative">
                            <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="url"
                                required
                                placeholder="https://exemple.com/suspect"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="h-11 w-full rounded-xl border border-input bg-background/70 pl-9 pr-3 font-mono text-sm outline-none transition focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </label>

                    <label className="block space-y-1.5 text-sm">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Contexte analyste (optionnel)</span>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Contexte initial et hypothese d'arnaque"
                            className="min-h-[90px] w-full resize-y rounded-xl border border-input bg-background/70 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                        />
                    </label>

                    {mutation.isError && (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4" />
                                <span>{errorMessage}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={mutation.isPending || !url.trim()}
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                        >
                            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Lancer l'ingestion
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
