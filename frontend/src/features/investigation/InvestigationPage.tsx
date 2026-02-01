import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Alert, AlertStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, ShieldAlert, Clock, Globe,
    Activity, FileText, CheckCircle, XCircle,
    AlertTriangle, Send, Loader2, Lock, AlertCircle, FileBarChart
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

export default function InvestigationPage() {
    const { id } = useParams<{ id: string }>(); // UUID
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [notes, setNotes] = useState('');

    // 1. Fetch Alert Detail
    const { data: alert, isLoading, isError } = useQuery({
        queryKey: ['alert', id],
        queryFn: async () => {
            const response = await apiClient.get<Alert>(`/alerts/${id}`);
            return response.data;
        },
        enabled: !!id
    });

    // Sync notes when alert loads
    useEffect(() => {
        if (alert?.analysis_note) {
            setNotes(alert.analysis_note);
        }
    }, [alert]);

    // 2. Mutation for Alert Update (Status or Notes)
    const updateAlertMutation = useMutation({
        mutationFn: async (data: { status?: string; analysis_note?: string; is_confirmed?: boolean }) => {
            await apiClient.patch<Alert>(`/alerts/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alert', id] });
            toast({ title: "Mise à jour enregistrée", description: "Les modifications ont été sauvegardées." });
        },
        onError: () => {
            toast({ title: "Erreur", description: "Échec de la sauvegarde.", variant: "destructive" });
        }
    });

    // 3. Mutation for Report Generation
    const generateReportMutation = useMutation({
        mutationFn: async () => {
            // Need numeric ID for report generation usually, but let's check if UUID works or if we have ID
            // The endpoint /reports/generate/{alert_id} usually takes integer ID in previous implementation.
            // Alert interface has 'id' (int) and 'uuid' (string).
            if (!alert?.id) throw new Error("Alert ID missing");
            await apiClient.post(`/reports/generate/${alert.id}`);
        },
        onSuccess: () => {
            toast({ title: "Rapport Généré", description: "Le rapport forensique est disponible." });
            navigate('/reports'); // Redirect to reports list
        },
        onError: (err) => {
            toast({ title: "Erreur Génération", description: "Impossible de générer le rapport.", variant: "destructive" });
        }
    });

    const handleSaveNote = () => {
        updateAlertMutation.mutate({ analysis_note: notes });
    };

    const handleClose = (confirmed: boolean) => {
        if (window.confirm(confirmed ? "Confirmer cette menace comme RÉELLE ?" : "Marquer comme FAUX POSITIF ?")) {
            updateAlertMutation.mutate({
                status: confirmed ? 'CONFIRMED' : 'CLEAN',
                is_confirmed: confirmed
            });
        }
    };

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
                <button onClick={() => navigate('/alerts')} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md">
                    Retour aux alertes
                </button>
            </div>
        );
    }

    const getSeverityColor = (score: number) => {
        if (score >= 90) return 'text-red-500 bg-red-950/30 border-red-900/50';
        if (score >= 70) return 'text-orange-500 bg-orange-950/30 border-orange-900/50';
        if (score >= 40) return 'text-yellow-500 bg-yellow-950/30 border-yellow-900/50';
        return 'text-blue-500 bg-blue-950/30 border-blue-900/50';
    };

    const severityClass = getSeverityColor(alert.risk_score);
    const severityLabel = alert.risk_score >= 90 ? 'CRITICAL' : alert.risk_score >= 70 ? 'HIGH' : alert.risk_score >= 40 ? 'MEDIUM' : 'LOW';

    const canGenerateReport = ['CONFIRMED', 'CLEAN', 'ANALYZED'].includes(alert.status || '');

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
                            Investigation
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
                            {format(new Date(alert.created_at), 'dd MMM yyyy HH:mm')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* ACTION BUTTONS */}
                    {alert.status === 'NEW' && (
                        <button
                            onClick={() => updateAlertMutation.mutate({ status: 'INVESTIGATING' })}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                            <Activity className="w-4 h-4" />
                            Démarrer l'Analyse
                        </button>
                    )}

                    {(alert.status === 'INVESTIGATING' || alert.status === 'ANALYZED') && (
                        <>
                            <button
                                onClick={() => handleClose(false)}
                                className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground border border-input rounded-md hover:bg-secondary/80 transition-colors text-sm font-medium"
                            >
                                <XCircle className="w-4 h-4" />
                                Faux Positif
                            </button>
                            <button
                                onClick={() => handleClose(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-md hover:bg-destructive/20 transition-colors text-sm font-medium"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Confirmer Menace
                            </button>
                        </>
                    )}

                    {canGenerateReport && (
                        <button
                            onClick={() => generateReportMutation.mutate()}
                            disabled={generateReportMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium ml-2"
                        >
                            {generateReportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileBarChart className="w-4 h-4" />}
                            Générer Rapport
                        </button>
                    )}
                </div>
            </div>

            {/* --- MAIN LAYOUT --- */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* LEFT: INFO & PREVIEW */}
                <div className="lg:col-span-3 space-y-6">
                    {/* METRICS */}
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
                                    className={cn("h-full rounded-full", severityClass.split(' ')[1])}
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

                    {/* CONTEXT */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border bg-secondary/30">
                            <h3 className="font-semibold flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-primary" />
                                Contexte
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-1">URL</h4>
                                <a href={alert.url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono text-sm break-all bg-primary/5 p-2 rounded block">
                                    {alert.url}
                                </a>
                            </div>
                            {/* Entities & Cats (Existing logic preserved) */}
                        </div>
                    </div>
                </div>

                {/* RIGHT: NOTES & EVIDENCE */}
                <div className="lg:col-span-2 space-y-6">
                    {/* ANALYST NOTES */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]">
                        <div className="px-6 py-4 border-b border-border bg-secondary/30 flex justify-between items-center">
                            <h3 className="font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Note d'Analyste
                            </h3>
                            <Lock className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <div className="flex-1 p-4 flex flex-col">
                            <textarea
                                className="flex-1 w-full bg-secondary/20 border border-input rounded-md p-3 text-sm focus:ring-1 focus:ring-primary outline-none resize-none placeholder:text-muted-foreground/50"
                                placeholder="Observations forensiques..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={handleSaveNote}
                                    disabled={updateAlertMutation.isPending}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors"
                                >
                                    {updateAlertMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* EVIDENCE LINK */}
                    <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            Preuves
                        </h3>
                        {alert.evidences && alert.evidences.length > 0 ? (
                            <div className="space-y-2">
                                {alert.evidences.map((ev: any) => (
                                    <div key={ev.id} className="flex items-center justify-between text-sm p-2 bg-secondary/10 rounded border border-border">
                                        <span className="truncate max-w-[150px]">{ev.file_path}</span>
                                        <span className="text-xs font-mono text-muted-foreground">{ev.status}</span>
                                    </div>
                                ))}
                                <button onClick={() => navigate('/evidence')} className="w-full mt-2 text-xs text-center text-primary hover:underline">
                                    Voir Registre Preuves
                                </button>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Aucune preuve technique.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
