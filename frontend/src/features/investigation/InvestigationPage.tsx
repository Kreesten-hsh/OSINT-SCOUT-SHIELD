import { useState } from 'react';
import { type AxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    CheckCircle,
    Clock,
    FileBarChart,
    FileText,
    Globe,
    Loader2,
    Lock,
    Send,
    ShieldAlert,
    XCircle,
} from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { Alert, AlertStatus } from '@/types';

type ApiErrorPayload = { message?: string; detail?: string };

interface GeneratedReport {
    id: number;
    uuid: string;
    report_hash: string;
    snapshot_hash_sha256: string;
    snapshot_version: string;
    generated_at: string;
    pdf_path: string;
}

interface IncidentDecisionData {
    incident_id: string;
    alert_status: string;
    decision_status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'ESCALATED' | 'EXECUTED';
    comment?: string | null;
}

function sourceLabel(sourceType: string): string {
    if (sourceType === 'CITIZEN_MOBILE_APP') return 'CITOYEN MOBILE';
    if (sourceType === 'CITIZEN_WEB_PORTAL') return 'CITOYEN WEB';
    return sourceType;
}

function isHttpTarget(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
}

function targetDisplay(url: string): string {
    if (url.startsWith('citizen://')) return 'Signal textuel (sans URL crawlable)';
    return url;
}

function targetHost(url: string): string {
    if (!isHttpTarget(url)) return 'Signal citoyen';
    try {
        return new URL(url).hostname;
    } catch {
        return 'Cible invalide';
    }
}

export default function InvestigationPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [notesDraft, setNotesDraft] = useState<string | null>(null);

    const { data: alert, isLoading, isError } = useQuery({
        queryKey: ['alert', id],
        queryFn: async () => {
            const response = await apiClient.get<Alert>(`/alerts/${id}`);
            return response.data;
        },
        enabled: !!id,
    });

    const updateAlertMutation = useMutation<
        APIResponse<Alert>,
        AxiosError<ApiErrorPayload>,
        { status?: AlertStatus; analysis_note?: string }
    >({
        mutationFn: async (data) => {
            const res = await apiClient.patch<APIResponse<Alert>>(`/alerts/${id}`, data);
            return res.data;
        },
        onSuccess: (response) => {
            if (!response.success) {
                toast({ title: 'Erreur', description: response.message || "Echec de l'action", variant: 'destructive' });
                return;
            }

            if (response.data) {
                queryClient.setQueryData(['alert', id], response.data);
            }
            queryClient.invalidateQueries({ queryKey: ['alert', id] });
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            queryClient.invalidateQueries({ queryKey: ['analysis-stats'] });
            setNotesDraft(null);
            toast({ title: 'Succes', description: response.message });
        },
        onError: (err) => {
            const msg = err.response?.data?.message || err.response?.data?.detail || 'Echec de la sauvegarde.';
            toast({ title: 'Erreur', description: msg, variant: 'destructive' });
        },
    });

    const generateReportMutation = useMutation<
        APIResponse<GeneratedReport>,
        AxiosError<ApiErrorPayload>,
        void
    >({
        mutationFn: async () => {
            if (!alert?.uuid) throw new Error('Alert UUID missing');
            const res = await apiClient.post<APIResponse<GeneratedReport>>(`/reports/generate/${alert.uuid}`);
            return res.data;
        },
        onSuccess: (response) => {
            if (!response.success) {
                toast({ title: 'Erreur', description: response.message, variant: 'destructive' });
                return;
            }
            toast({ title: 'Rapport genere', description: response.message });
            navigate('/reports');
        },
        onError: (err) => {
            const msg = err.response?.data?.message || err.response?.data?.detail || 'Impossible de generer le rapport.';
            toast({ title: 'Erreur generation', description: msg, variant: 'destructive' });
        },
    });

    const decisionMutation = useMutation<
        APIResponse<IncidentDecisionData>,
        AxiosError<ApiErrorPayload>,
        { decision: 'CONFIRM' | 'REJECT' | 'ESCALATE'; comment?: string }
    >({
        mutationFn: async (data) => {
            const res = await apiClient.patch<APIResponse<IncidentDecisionData>>(`/incidents/${id}/decision`, data);
            return res.data;
        },
        onSuccess: (response) => {
            if (!response.success) {
                toast({ title: 'Erreur', description: response.message || 'Echec de la decision', variant: 'destructive' });
                return;
            }
            queryClient.invalidateQueries({ queryKey: ['alert', id] });
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            toast({ title: 'Decision enregistree', description: response.message });
        },
        onError: (err) => {
            const msg = err.response?.data?.message || err.response?.data?.detail || 'Echec de la decision SOC.';
            toast({ title: 'Erreur decision', description: msg, variant: 'destructive' });
        },
    });

    if (isLoading) {
        return (
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
                <p>Chargement du dossier d&apos;investigation...</p>
            </div>
        );
    }

    if (isError || !alert) {
        return (
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center text-destructive">
                <AlertCircle className="mb-4 h-12 w-12" />
                <h2 className="text-xl font-bold">Erreur de chargement</h2>
                <p className="mb-6 opacity-80">Impossible de recuperer les details de l&apos;alerte.</p>
                <button onClick={() => navigate('/alerts')} className="rounded-md bg-secondary px-4 py-2 text-secondary-foreground">
                    Retour aux alertes
                </button>
            </div>
        );
    }

    const notesValue = notesDraft ?? alert.analysis_note ?? '';

    const getSeverityColor = (score: number) => {
        if (score >= 90) return 'text-red-500 bg-red-950/30 border-red-900/50';
        if (score >= 70) return 'text-orange-500 bg-orange-950/30 border-orange-900/50';
        if (score >= 40) return 'text-yellow-500 bg-yellow-950/30 border-yellow-900/50';
        return 'text-blue-500 bg-blue-950/30 border-blue-900/50';
    };

    const handleSaveNote = () => {
        updateAlertMutation.mutate({ analysis_note: notesValue });
    };

    const handleConfirm = () => {
        const note = notesValue.trim();
        if (!note) {
            toast({
                title: 'Note requise',
                description: "Vous devez ajouter une note d'analyse avant de confirmer.",
                variant: 'destructive',
            });
            return;
        }
        if (window.confirm('Confirmer cette menace comme REELLE ?')) {
            decisionMutation.mutate({ decision: 'CONFIRM', comment: note });
        }
    };

    const handleDismiss = () => {
        const note = notesValue.trim();
        if (!note) {
            toast({
                title: 'Note requise',
                description: 'Vous devez ajouter une justification avant de classer sans suite.',
                variant: 'destructive',
            });
            return;
        }
        if (window.confirm('Classer cette alerte sans suite ?')) {
            decisionMutation.mutate({ decision: 'REJECT', comment: note });
        }
    };

    const severityClass = getSeverityColor(alert.risk_score);
    const severityLabel = alert.risk_score >= 90 ? 'CRITICAL' : alert.risk_score >= 70 ? 'HIGH' : alert.risk_score >= 40 ? 'MEDIUM' : 'LOW';
    const canGenerateReport = alert.status === 'CONFIRMED' || alert.status === 'BLOCKED_SIMULATED';

    return (
        <div className="animate-in space-y-6 fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-center">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/alerts')}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
                            Investigation
                            <span className="font-mono text-base font-normal text-muted-foreground">#{alert.uuid.slice(0, 8)}</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 pl-9">
                        <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-medium', severityClass)}>{severityLabel}</span>
                        <Badge variant="outline" className="uppercase tracking-wide text-xs">
                            {alert.status}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(alert.created_at), 'dd MMM yyyy HH:mm')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {alert.status === 'NEW' && (
                        <button
                            onClick={() => updateAlertMutation.mutate({ status: 'IN_REVIEW' })}
                            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                            <Activity className="h-4 w-4" />
                            Prendre en charge
                        </button>
                    )}

                    {alert.status === 'IN_REVIEW' && (
                        <>
                            <button
                                onClick={handleDismiss}
                                className="flex items-center gap-2 rounded-md border border-input bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                            >
                                <XCircle className="h-4 w-4" />
                                Classer sans suite
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                            >
                                <CheckCircle className="h-4 w-4" />
                                Confirmer la menace
                            </button>
                        </>
                    )}

                    {canGenerateReport && (
                        <button
                            onClick={() => generateReportMutation.mutate()}
                            disabled={generateReportMutation.isPending}
                            className="ml-2 flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                        >
                            {generateReportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBarChart className="h-4 w-4" />}
                            Generer rapport
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <div className="space-y-6 lg:col-span-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                            <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                                <Activity className="h-4 w-4" />
                                Risk score
                            </div>
                            <div className="font-mono text-3xl font-bold text-foreground">
                                {alert.risk_score}<span className="text-lg font-normal text-muted-foreground">/100</span>
                            </div>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
                                <div className={cn('h-full rounded-full', severityClass.split(' ')[1])} style={{ width: `${alert.risk_score}%` }} />
                            </div>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                            <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                                <Globe className="h-4 w-4" />
                                Source
                            </div>
                            <div className="truncate text-lg font-medium text-foreground" title={alert.url}>
                                {targetHost(alert.url)}
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">{sourceLabel(alert.source_type)}</div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                        <div className="border-b border-border bg-secondary/30 px-6 py-4">
                            <h3 className="flex items-center gap-2 font-semibold">
                                <ShieldAlert className="h-4 w-4 text-primary" />
                                Contexte
                            </h3>
                        </div>
                        <div className="space-y-4 p-6">
                            <div>
                                <h4 className="mb-1 text-sm font-medium text-muted-foreground">URL</h4>
                                {isHttpTarget(alert.url) ? (
                                    <a href={alert.url} target="_blank" rel="noreferrer" className="block break-all rounded bg-primary/5 p-2 font-mono text-sm text-primary hover:underline">
                                        {alert.url}
                                    </a>
                                ) : (
                                    <div className="block break-all rounded bg-secondary/20 p-2 font-mono text-sm text-muted-foreground">
                                        {targetDisplay(alert.url)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 lg:col-span-2">
                    <div className="flex h-[400px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                        <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-6 py-4">
                            <h3 className="flex items-center gap-2 font-semibold">
                                <FileText className="h-4 w-4 text-primary" />
                                Note d&apos;analyste
                            </h3>
                            <Lock className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                            <textarea
                                className="flex-1 resize-none rounded-md border border-input bg-secondary/20 p-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary"
                                placeholder="Observations forensiques..."
                                value={notesValue}
                                onChange={(e) => setNotesDraft(e.target.value)}
                            />
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={handleSaveNote}
                                    disabled={updateAlertMutation.isPending}
                                    className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                >
                                    {updateAlertMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <h3 className="mb-2 flex items-center gap-2 font-semibold">
                            <FileText className="h-4 w-4 text-primary" />
                            Preuves
                        </h3>
                        {alert.evidences && alert.evidences.length > 0 ? (
                            <div className="space-y-2">
                                {alert.evidences.map((ev) => (
                                    <div key={ev.id} className="flex items-center justify-between rounded border border-border bg-secondary/10 p-2 text-sm">
                                        <span className="max-w-[150px] truncate">{ev.file_path}</span>
                                        <span className="font-mono text-xs text-muted-foreground">{ev.status}</span>
                                    </div>
                                ))}
                                <button onClick={() => navigate('/evidence')} className="mt-2 w-full text-center text-xs text-primary hover:underline">
                                    Voir registre preuves
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
