import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Alert, AlertStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, ShieldAlert, Clock, Globe,
    Activity, FileText, CheckCircle, XCircle,
    AlertTriangle, Send, Loader2, Lock, AlertCircle
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function InvestigationPage() {
    const { id } = useParams<{ id: string }>(); // UUID
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [notes, setNotes] = useState(''); // Local state for notes (mocked for now as backend model doesn't store it yet)

    // 1. Fetch Alert Detail
    const { data: alert, isLoading, isError } = useQuery({
        queryKey: ['alert', id],
        queryFn: async () => {
            const response = await apiClient.get<Alert>(`/alerts/${id}`);
            return response.data;
        },
        enabled: !!id
    });

    // 2. Mutation for Status Update
    const updateStatusMutation = useMutation({
        mutationFn: async (newStatus: AlertStatus) => {
            await apiClient.patch<Alert>(`/alerts/${id}`, { status: newStatus });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alert', id] });
        }
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-muted-foreground">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                <p>Chargement du dossier d'investigation...</p>
            </div>
        );
    }

    if (isError || !alert) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-destructive">
                <AlertCircle className="w-12 h-12 mb-4" />
                <h2 className="text-xl font-bold">Erreur de chargement</h2>
                <p className="mb-6 opacity-80">Impossible de récupérer les détails de l'alerte.</p>
                <button
                    onClick={() => navigate('/alerts')}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                    Retour aux alertes
                </button>
            </div>
        );
    }

    // Helper for Severity Color (Derived from Risk Score if not explicit)
    const getSeverityColor = (score: number) => {
        if (score >= 90) return 'text-red-500 bg-red-950/30 border-red-900/50';
        if (score >= 70) return 'text-orange-500 bg-orange-950/30 border-orange-900/50';
        if (score >= 40) return 'text-yellow-500 bg-yellow-950/30 border-yellow-900/50';
        return 'text-blue-500 bg-blue-950/30 border-blue-900/50';
    };

    const severityClass = getSeverityColor(alert.risk_score);
    const severityLabel = alert.risk_score >= 90 ? 'CRITICAL' : alert.risk_score >= 70 ? 'HIGH' : alert.risk_score >= 40 ? 'MEDIUM' : 'LOW';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/alerts')}
                            className="p-1 hover:bg-secondary/50 rounded-md transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            Investigation Dossier
                            <span className="font-mono text-base font-normal text-muted-foreground">#{alert.uuid.slice(0, 8)}</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 pl-9">
                        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", severityClass)}>
                            {severityLabel}
                        </span>
                        <Badge variant="outline" className="uppercase text-xs tracking-wide">
                            {alert.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Détecté le {format(new Date(alert.created_at), 'dd MMM yyyy à HH:mm')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {alert.status !== 'INVESTIGATING' && (
                        <button
                            onClick={() => updateStatusMutation.mutate('INVESTIGATING')}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 transition-colors text-sm font-medium"
                        >
                            <Activity className="w-4 h-4" />
                            Démarrer Investigation
                        </button>
                    )}
                    {alert.status !== 'CLOSED' && (
                        <button
                            onClick={() => updateStatusMutation.mutate('CLOSED')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-md hover:bg-green-500/20 transition-colors text-sm font-medium"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Clôturer
                        </button>
                    )}
                </div>
            </div>

            {/* --- MAIN LAYOUT (2 COLUMNS) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* LEFT COLUMN (Details & Context) - 60% approx -> 3/5 */}
                <div className="lg:col-span-3 space-y-6">

                    {/* KEY METRICS CARD */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-xs uppercase font-semibold">
                                <Activity className="w-4 h-4" />
                                Risk Score
                            </div>
                            <div className="text-3xl font-mono font-bold text-foreground">
                                {alert.risk_score}<span className="text-lg text-muted-foreground font-normal">/100</span>
                            </div>
                            <div className="mt-2 h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full", severityClass.split(' ')[1])} // using bg-color from helper
                                    style={{ width: `${alert.risk_score}%` }}
                                />
                            </div>
                        </div>
                        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-xs uppercase font-semibold">
                                <Globe className="w-4 h-4" />
                                Source
                            </div>
                            <div className="text-lg font-medium text-foreground truncate " title={alert.url}>
                                {new URL(alert.url).hostname}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                {alert.source_type}
                            </div>
                        </div>
                    </div>

                    {/* ALERT CONTEXT CARD */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-secondary/30">
                            <h3 className="font-semibold flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-primary" />
                                Contexte de la Menace
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-1">URL Complète</h4>
                                <a
                                    href={alert.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline font-mono text-sm break-all bg-primary/5 p-2 rounded block"
                                >
                                    {alert.url}
                                </a>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Entités Détectées</h4>
                                    {alert.analysis_results?.entities && alert.analysis_results.entities.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {alert.analysis_results.entities.map((ent: any, i: number) => (
                                                <Badge key={i} variant="secondary" className="font-mono text-xs">
                                                    {ent}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">Aucune entité extraite.</p>
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Catégories NLP</h4>
                                    {alert.analysis_results?.categories && alert.analysis_results.categories.length > 0 ? (
                                        <div className="flex flex-col gap-2">
                                            {alert.analysis_results.categories.map((cat: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center text-sm">
                                                    <span>{cat.name || cat}</span>
                                                    {cat.score && <span className="text-xs text-muted-foreground">{Math.round(cat.score * 100)}%</span>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">Non catégorisé.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TIMELINE (Simulated for Batch 1, real data later) */}
                    <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            Timeline d'Activité
                        </h3>
                        <div className="relative border-l border-border ml-2 space-y-6">
                            <div className="ml-6 relative">
                                <div className="absolute -left-[31px] bg-primary rounded-full w-2.5 h-2.5 border-2 border-background" />
                                <p className="text-sm font-medium">Détection Initiale</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(alert.created_at), 'dd MMM yyyy HH:mm:ss')}</p>
                            </div>
                            <div className="ml-6 relative">
                                <div className="absolute -left-[31px] bg-secondary-foreground rounded-full w-2.5 h-2.5 border-2 border-background" />
                                <p className="text-sm font-medium">Analyse Automatisée (NLP)</p>
                                <p className="text-xs text-muted-foreground">Automatique (+2s)</p>
                            </div>
                            {alert.status !== 'NEW' && (
                                <div className="ml-6 relative">
                                    <div className="absolute -left-[31px] bg-yellow-500 rounded-full w-2.5 h-2.5 border-2 border-background" />
                                    <p className="text-sm font-medium">Statut modifié: {alert.status}</p>
                                    <p className="text-xs text-muted-foreground">Mise à jour récente</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN (Actions & Notes) - 40% approx -> 2/5 */}
                <div className="lg:col-span-2 space-y-6">

                    {/* ANALYST NOTES */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]">
                        <div className="px-6 py-4 border-b border-border bg-secondary/30 flex justify-between items-center">
                            <h3 className="font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Notes d'Analyste
                            </h3>
                            <Lock className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <div className="flex-1 p-4 flex flex-col">
                            <textarea
                                className="flex-1 w-full bg-secondary/20 border border-input rounded-md p-3 text-sm focus:ring-1 focus:ring-primary outline-none resize-none placeholder:text-muted-foreground/50"
                                placeholder="Saisir vos observations ici..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                            <div className="mt-4 flex justify-end">
                                <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors">
                                    <Send className="w-3 h-3" />
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* EVIDENCE PREVIEW MINI */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-secondary/30">
                            <h3 className="font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Preuves Capturées
                            </h3>
                        </div>
                        <div className="p-4">
                            {alert.evidence ? (
                                <div className="border border-border rounded-lg p-3 bg-secondary/10 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center text-muted-foreground">
                                        IMG
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{alert.evidence.filename || 'screenshot.png'}</p>
                                        <p className="text-xs text-muted-foreground font-mono truncate">{alert.evidence.file_hash?.substring(0, 16)}...</p>
                                    </div>
                                    <button className="text-xs text-primary hover:underline">
                                        Voir
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-muted-foreground text-sm">
                                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    Aucune preuve associée.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

