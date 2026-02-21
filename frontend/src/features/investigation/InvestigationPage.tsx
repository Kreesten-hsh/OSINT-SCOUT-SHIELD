import { useState } from 'react';
import { type AxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, FileBarChart, FileText, Loader2, Send, ShieldAlert, Siren, Trash2, XCircle } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import type { Alert, AlertStatus } from '@/types';
import { alertStatusLabel, alertStatusVariant, displayTarget, riskSeverity, sourceLabel } from '@/lib/presentation';
import { parseAnalystNotes } from '@/lib/analyst-notes';

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

interface AlertDeleteData {
    alert_uuid: string;
    deleted_reports_count: number;
    deleted_evidences_count: number;
}

export default function InvestigationPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [notesDraft, setNotesDraft] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

    const generateReportMutation = useMutation<APIResponse<GeneratedReport>, AxiosError<ApiErrorPayload>, void>({
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

    const deleteAlertMutation = useMutation<APIResponse<AlertDeleteData>, AxiosError<ApiErrorPayload>, void>({
        mutationFn: async () => {
            const res = await apiClient.delete<APIResponse<AlertDeleteData>>(`/alerts/${id}`);
            return res.data;
        },
        onSuccess: (response) => {
            if (!response.success) {
                toast({ title: 'Suppression impossible', description: response.message, variant: 'destructive' });
                return;
            }
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            queryClient.invalidateQueries({ queryKey: ['citizen-incidents'] });
            queryClient.invalidateQueries({ queryKey: ['reports-list'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast({ title: 'Alerte supprimee', description: 'Dossier et artefacts associes supprimes.' });
            navigate('/alerts');
        },
        onError: (err) => {
            const msg = err.response?.data?.message || err.response?.data?.detail || 'Erreur suppression alerte.';
            toast({ title: 'Suppression impossible', description: msg, variant: 'destructive' });
        },
        onSettled: () => {
            setShowDeleteDialog(false);
        },
    });

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement du dossier...
            </div>
        );
    }

    if (isError || !alert) {
        return (
            <div className="panel border-destructive/25 bg-destructive/10 p-8 text-center text-destructive">
                Impossible de recuperer les details de l'alerte.
            </div>
        );
    }

    const notesValue = notesDraft ?? alert.analysis_note ?? '';
    const notes = parseAnalystNotes(alert.analysis_note);
    const canGenerateReport = alert.status === 'CONFIRMED' || alert.status === 'BLOCKED_SIMULATED';

    return (
        <div className="space-y-5">
            <section className="panel p-5 fade-rise-in">
                <div className="mb-4 flex items-center gap-2">
                    <button
                        onClick={() => navigate('/alerts')}
                        className="inline-flex rounded-lg border border-input bg-background/50 p-2 text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <h2 className="font-display text-2xl font-semibold tracking-tight">Investigation #{alert.uuid.slice(0, 8)}</h2>
                        <p className="text-sm text-muted-foreground">{sourceLabel(alert.source_type)} - {new Date(alert.created_at).toLocaleString()}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={riskSeverity(alert.risk_score) === 'CRITICAL' ? 'destructive' : riskSeverity(alert.risk_score) === 'HIGH' ? 'warning' : 'outline'}>
                        {riskSeverity(alert.risk_score)} / {alert.risk_score}
                    </Badge>
                    <Badge variant={alertStatusVariant(alert.status)}>{alertStatusLabel(alert.status)}</Badge>
                    <span className="rounded-lg border border-border/70 bg-secondary/20 px-2.5 py-1 text-xs text-muted-foreground">{displayTarget(alert.url)}</span>
                </div>
            </section>

            <section className="panel p-4 fade-rise-in-1">
                <div className="flex flex-wrap items-center gap-2">
                    {alert.status === 'NEW' && (
                        <button
                            onClick={() => updateAlertMutation.mutate({ status: 'IN_REVIEW' })}
                            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                        >
                            <ShieldAlert className="h-4 w-4" /> Prendre en charge
                        </button>
                    )}

                    <button
                        onClick={() => decisionMutation.mutate({ decision: 'ESCALATE', comment: notesValue.trim() || undefined })}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300 transition hover:bg-amber-500/20"
                    >
                        <Siren className="h-4 w-4" /> Escalader
                    </button>

                    <button
                        onClick={() => decisionMutation.mutate({ decision: 'REJECT', comment: notesValue.trim() || undefined })}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive transition hover:bg-destructive/20"
                    >
                        <XCircle className="h-4 w-4" /> Classer sans suite
                    </button>

                    <button
                        onClick={() => decisionMutation.mutate({ decision: 'CONFIRM', comment: notesValue.trim() || undefined })}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/20"
                    >
                        <CheckCircle className="h-4 w-4" /> Confirmer
                    </button>

                    <button
                        onClick={() => generateReportMutation.mutate()}
                        disabled={!canGenerateReport || generateReportMutation.isPending}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-primary/30 bg-primary/15 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-50"
                    >
                        {generateReportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBarChart className="h-4 w-4" />}
                        Generer rapport
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={deleteAlertMutation.isPending}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
                    >
                        {deleteAlertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Supprimer
                    </button>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 fade-rise-in-2">
                <article className="panel p-4">
                    <h3 className="section-title mb-2 text-lg">Note analyste</h3>
                    <textarea
                        className="min-h-[180px] w-full rounded-xl border border-input bg-secondary/20 p-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                        placeholder="Observations forensiques"
                        value={notesValue}
                        onChange={(e) => setNotesDraft(e.target.value)}
                    />
                    <div className="mt-3 flex justify-end">
                        <button
                            onClick={() => updateAlertMutation.mutate({ analysis_note: notesValue })}
                            disabled={updateAlertMutation.isPending}
                            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                        >
                            {updateAlertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Enregistrer note
                        </button>
                    </div>
                </article>

                <article className="panel p-4">
                    <h3 className="section-title mb-2 text-lg">Journal de decisions</h3>
                    {notes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune entree structuree.</p>
                    ) : (
                        <ol className="space-y-2">
                            {notes.map((entry) => (
                                <li key={entry.id} className="rounded-xl border border-border/70 bg-secondary/20 p-3">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{entry.title}</p>
                                    <p className="mt-1 text-sm font-medium">{entry.content}</p>
                                    {entry.details.length > 0 ? (
                                        <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                                            {entry.details.map((detail, idx) => (
                                                <li key={`${entry.id}-${idx}`}>- {detail}</li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </li>
                            ))}
                        </ol>
                    )}
                </article>
            </section>

            <section className="panel p-4 fade-rise-in-3">
                <h3 className="section-title mb-2 text-lg">Preuves associees</h3>
                {alert.evidences && alert.evidences.length > 0 ? (
                    <div className="space-y-2">
                        {alert.evidences.map((ev) => (
                            <div key={ev.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-secondary/15 px-3 py-2 text-sm">
                                <span className="max-w-[65%] truncate">{ev.file_path}</span>
                                <Badge variant={ev.status === 'SEALED' ? 'warning' : 'outline'}>{ev.status === 'SEALED' ? 'Scellee' : 'Active'}</Badge>
                            </div>
                        ))}
                        <Link to="/evidence" className="text-xs text-primary hover:underline">
                            Ouvrir registre des preuves
                        </Link>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">Aucune preuve technique associee.</p>
                )}
            </section>

            <section className="panel p-4 fade-rise-in-3">
                <h3 className="section-title mb-2 text-lg">Rapports</h3>
                <Link to="/reports" className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-input px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground">
                    <FileText className="h-4 w-4" /> Voir tous les rapports
                </Link>
            </section>

            <ConfirmDialog
                open={showDeleteDialog}
                title="Confirmer la suppression"
                description="Supprimer cette alerte supprimera aussi les preuves, rapports et fichiers associes. Cette action est irreversible."
                confirmLabel="Supprimer l'alerte"
                isLoading={deleteAlertMutation.isPending}
                onCancel={() => {
                    if (!deleteAlertMutation.isPending) {
                        setShowDeleteDialog(false);
                    }
                }}
                onConfirm={() => deleteAlertMutation.mutate()}
            />
        </div>
    );
}
