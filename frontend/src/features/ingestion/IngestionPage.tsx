import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Link as LinkIcon, AlertTriangle, Shield, Globe, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APIResponse } from '@/api/types';
import { Alert } from '@/types';

export default function IngestionPage() {
    const navigate = useNavigate();
    const [sourceType, setSourceType] = useState<'WEB' | 'SOCIAL' | 'DARKWEB'>('WEB');
    const [url, setUrl] = useState('');
    const [notes, setNotes] = useState('');

    const mutation = useMutation({
        mutationFn: async (data: { url: string; source_type: string; notes?: string }) => {
            const response = await apiClient.post<APIResponse<Alert>>('/ingestion/manual', data);
            return response.data;
        },
        onSuccess: (response) => {
            if (response.success && response.data && response.data.uuid) {
                navigate(`/alerts/${response.data.uuid}`);
            } else {
                // Fallback or error handling
                console.error("Ingestion success but no data", response);
                navigate('/alerts');
            }
        },
        onError: (err: any) => {
            console.error("Ingestion error", err);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;
        mutation.mutate({ url, source_type: sourceType, notes });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* HEADER */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                    <Shield className="w-8 h-8 text-primary" />
                    Ingestion de Cible
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Injectez une nouvelle source dans le moteur de renseignement pour analyse immÃ©diate.
                </p>
            </div>

            {/* SELECTION DU TYPE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                    onClick={() => setSourceType('WEB')}
                    className={cn(
                        "cursor-pointer border rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:bg-secondary/20",
                        sourceType === 'WEB' ? "border-primary bg-primary/5 ring-1 ring-primary/50" : "border-border bg-card"
                    )}
                >
                    <Globe className={cn("w-8 h-8", sourceType === 'WEB' ? "text-primary" : "text-muted-foreground")} />
                    <span className="font-semibold text-sm">Site Web / URL</span>
                </div>
                <div
                    onClick={() => setSourceType('SOCIAL')}
                    className={cn(
                        "cursor-pointer border rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:bg-secondary/20",
                        sourceType === 'SOCIAL' ? "border-primary bg-primary/5 ring-1 ring-primary/50" : "border-border bg-card"
                    )}
                >
                    <div className="relative">
                        <ArrowRight className="w-8 h-8 rotate-45 text-muted-foreground opacity-50 absolute" />
                        {/* Using a generic icon representation for social if standard ones missing */}
                        <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center font-bold">@</div>
                    </div>
                    <span className="font-semibold text-sm">RÃ©seaux Sociaux</span>
                </div>
                <div
                    onClick={() => setSourceType('DARKWEB')}
                    className={cn(
                        "cursor-pointer border rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:bg-secondary/20",
                        sourceType === 'DARKWEB' ? "border-primary bg-primary/5 ring-1 ring-primary/50" : "border-border bg-card"
                    )}
                >
                    <Shield className={cn("w-8 h-8", sourceType === 'DARKWEB' ? "text-destructive" : "text-muted-foreground")} />
                    <span className="font-semibold text-sm">Dark Web / Onion</span>
                </div>
            </div>

            {/* FORMULAIRE PRINCIPAL */}
            <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="space-y-4">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-primary" />
                            URL Cible
                        </label>
                        <div className="relative group">
                            <input
                                type="url"
                                required
                                placeholder="https://exemple.com/suspect"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-mono"
                            />
                            <div className="absolute inset-0 rounded-md ring-1 ring-primary/20 group-hover:ring-primary/40 pointer-events-none transition-all" />
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            Le systÃ¨me lancera automatiquement les crawlers Playwright.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-medium leading-none">Notes de l'Analyste (Optionnel)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Contexte initial, hypothÃ¨ses, vecteurs de menace prÃ©sumÃ©s..."
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                        />
                    </div>

                    {mutation.isError && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-3 text-destructive animate-in slide-in-from-top-2">
                            <AlertTriangle className="w-5 h-5" />
                            <div className="text-sm font-medium">
                                {(mutation.error as any)?.response?.data?.message || "Ã‰chec de l'ingestion : VÃ©rifiez l'URL ou la connexion backend."}
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={mutation.isPending || !url}
                            className={cn(
                                "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                "bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 py-2 w-full sm:w-auto"
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
                                    Lancer l'Ingestion
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>

            {/* INFO PANEL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div className="p-4 border border-dashed border-border rounded-lg bg-secondary/10">
                    <h4 className="font-semibold mb-2 text-foreground">Flux de Traitement</h4>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Validation de l'URL et vÃ©rification DNS.</li>
                        <li>Capture DOM via Playwright (Headless Browser).</li>
                        <li>Extraction des entitÃ©s (Noms, Lieux, Crypto).</li>
                        <li>Archivage de la preuve (Screenshot SHA-256).</li>
                    </ul>
                </div>
                <div className="p-4 border border-dashed border-border rounded-lg bg-secondary/10">
                    <h4 className="font-semibold mb-2 text-foreground">ConfidentialitÃ© & OpSec</h4>
                    <p>
                        L'ingestion utilise une rotation de User-Agents et de proxys (si configurÃ©).
                        Les mÃ©tadonnÃ©es locale de l'analyste ne sont pas transmises Ã  la cible.
                    </p>
                </div>
            </div>
        </div>
    );
}

