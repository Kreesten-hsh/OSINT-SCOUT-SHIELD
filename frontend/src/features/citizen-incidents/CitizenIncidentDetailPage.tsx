import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    Loader2,
    RefreshCcw,
    Send,
    ShieldAlert,
    ShieldCheck,
    ShieldX,
    Siren,
} from 'lucide-react';
import type { AxiosError } from 'axios';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import type { CitizenIncidentAttachment, CitizenIncidentDetailData } from '@/types';

type ApiErrorPayload = { message?: string; detail?: string };
type PlaybookActionType = 'BLOCK_NUMBER' | 'SUSPEND_WALLET' | 'ENFORCE_MFA' | 'BLACKLIST_ADD' | 'USER_NOTIFY';

interface ShieldDispatchData {
    dispatch_id: string;
    incident_id: string;
    action_type: PlaybookActionType;
    decision_status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'ESCALATED' | 'EXECUTED';
    operator_status: 'SENT' | 'RECEIVED' | 'EXECUTED' | 'FAILED';
    callback_required: boolean;
}

interface ShieldTimelineItem {
    dispatch_id: string;
    incident_id: string;
    action_type: PlaybookActionType;
    decision_status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'ESCALATED' | 'EXECUTED';
    operator_status: 'SENT' | 'RECEIVED' | 'EXECUTED' | 'FAILED';
    created_at: string;
    updated_at?: string | null;
}

interface ShieldTimelineData {
    incident_id: string;
    total_actions: number;
    actions: ShieldTimelineItem[];
}

interface IncidentDecisionData {
    incident_id: string;
    alert_status: string;
    decision_status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'ESCALATED' | 'EXECUTED';
    comment?: string | null;
}

const ACTION_LABELS: Record<PlaybookActionType, string> = {
    BLOCK_NUMBER: 'Bloquer numero',
    SUSPEND_WALLET: 'Suspendre wallet',
    ENFORCE_MFA: 'Forcer MFA',
    BLACKLIST_ADD: 'Ajouter blacklist',
    USER_NOTIFY: 'Notifier utilisateur',
};

function formatDate(value: string): string {
    try {
        return format(new Date(value), 'dd MMM yyyy HH:mm');
    } catch {
        return value;
    }
}

function statusBadgeVariant(status: CitizenIncidentDetailData['status']): 'default' | 'warning' | 'destructive' | 'success' | 'outline' {
    if (status === 'BLOCKED_SIMULATED') return 'success';
    if (status === 'CONFIRMED') return 'destructive';
    if (status === 'IN_REVIEW') return 'warning';
    if (status === 'DISMISSED') return 'outline';
    return 'default';
}

function statusLabel(status: CitizenIncidentDetailData['status']): string {
    if (status === 'NEW') return 'Nouveau';
    if (status === 'IN_REVIEW') return 'En revision';
    if (status === 'CONFIRMED') return 'Confirme';
    if (status === 'DISMISSED') return 'Classe sans suite';
    return 'Bloque simule';
}

function riskTone(score: number): string {
    if (score >= 80) return 'text-red-400';
    if (score >= 50) return 'text-amber-300';
    return 'text-emerald-300';
}

function AttachmentPreview({ attachment }: { attachment: CitizenIncidentAttachment }) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['citizen-evidence-preview', attachment.evidence_id],
        queryFn: async () => {
            const response = await apiClient.get(attachment.preview_endpoint, { responseType: 'blob' });
            return URL.createObjectURL(response.data);
        },
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        return () => {
            if (data) URL.revokeObjectURL(data);
        };
    }, [data]);

    return (
        <article className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="aspect-video bg-secondary/20">
                {isLoading && (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Chargement image...
                    </div>
                )}
                {isError && (
                    <div className="flex h-full items-center justify-center text-xs text-destructive">Preview indisponible</div>
                )}
                {data && <img src={data} alt={attachment.file_path} className="h-full w-full object-cover" />}
            </div>
            <div className="space-y-1 p-3 text-[11px] text-muted-foreground">
                <p className="truncate">{attachment.file_path}</p>
                <p className="font-mono">SHA-256: {attachment.file_hash.slice(0, 16)}...</p>
                <p>{attachment.captured_at ? formatDate(attachment.captured_at) : '-'}</p>
            </div>
        </article>
    );
}

export default function CitizenIncidentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [playbookAction, setPlaybookAction] = useState<PlaybookActionType>('BLOCK_NUMBER');
    const [decisionComment, setDecisionComment] = useState('');

    const { data: incident, isLoading, isError } = useQuery({
        queryKey: ['citizen-incident', id],
        queryFn: async () => {
            const response = await apiClient.get<APIResponse<CitizenIncidentDetailData>>(`/incidents/citizen/${id}`);
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Impossible de charger incident');
            }
            return response.data.data;
        },
        enabled: !!id,
    });

    const { data: shieldTimeline, isLoading: timelineLoading, refetch: refetchTimeline } = useQuery({
        queryKey: ['shield-actions', id],
        queryFn: async () => {
            const response = await apiClient.get<APIResponse<ShieldTimelineData>>(`/shield/incidents/${id}/actions`);
            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.message || 'Erreur chargement timeline SHIELD');
            }
            return response.data.data;
        },
        enabled: !!id,
    });

    const dispatchMutation = useMutation<APIResponse<ShieldDispatchData>, AxiosError<ApiErrorPayload>, void>({
        mutationFn: async () => {
            const response = await apiClient.post<APIResponse<ShieldDispatchData>>('/shield/actions/dispatch', {
                incident_id: id,
                action_type: playbookAction,
                reason: decisionComment.trim() || null,
                auto_callback: true,
            });
            return response.data;
        },
        onSuccess: (payload) => {
            if (!payload.success) {
                toast({ title: 'Erreur SHIELD', description: payload.message, variant: 'destructive' });
                return;
            }
            queryClient.invalidateQueries({ queryKey: ['citizen-incident', id] });
            queryClient.invalidateQueries({ queryKey: ['citizen-incidents'] });
            queryClient.invalidateQueries({ queryKey: ['shield-actions', id] });
            toast({ title: 'Action operateur simulee', description: payload.message });
        },
        onError: (err) => {
            const msg = err.response?.data?.message || err.response?.data?.detail || 'Erreur dispatch SHIELD';
            toast({ title: 'Erreur', description: msg, variant: 'destructive' });
        },
    });

    const decisionMutation = useMutation<
        APIResponse<IncidentDecisionData>,
        AxiosError<ApiErrorPayload>,
        { decision: 'CONFIRM' | 'REJECT' | 'ESCALATE' }
    >({
        mutationFn: async (payload) => {
            const response = await apiClient.patch<APIResponse<IncidentDecisionData>>(`/incidents/${id}/decision`, {
                decision: payload.decision,
                comment: decisionComment.trim() || null,
            });
            return response.data;
        },
        onSuccess: (payload) => {
            if (!payload.success) {
                toast({ title: 'Erreur decision', description: payload.message, variant: 'destructive' });
                return;
            }
            queryClient.invalidateQueries({ queryKey: ['citizen-incident', id] });
            queryClient.invalidateQueries({ queryKey: ['citizen-incidents'] });
            toast({ title: 'Decision enregistree', description: payload.message });
        },
        onError: (err) => {
            const msg = err.response?.data?.message || err.response?.data?.detail || 'Erreur decision';
            toast({ title: 'Erreur', description: msg, variant: 'destructive' });
        },
    });

    const canDispatchShield = incident?.status === 'CONFIRMED' || incident?.status === 'BLOCKED_SIMULATED';

    const riskProgress = useMemo(() => Math.min(100, Math.max(0, incident?.risk_score ?? 0)), [incident?.risk_score]);

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement incident...
            </div>
        );
    }

    if (isError || !incident) {
        return <div className="flex min-h-[60vh] items-center justify-center text-destructive">Impossible de charger cet incident.</div>;
    }

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/10 p-6">
                <div className="pointer-events-none absolute -right-24 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative z-10 space-y-4">
                    <button
                        onClick={() => navigate('/incidents-signales')}
                        className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-secondary/30 hover:text-foreground"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" /> Retour incidents signales
                    </button>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-primary/90">Dossier signalement</p>
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Incident #{incident.alert_uuid.slice(0, 8)}</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {incident.phone_number} · {incident.channel === 'MOBILE_APP' ? 'Canal mobile' : 'Canal web'} ·
                                {` ${formatDate(incident.created_at)}`}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={statusBadgeVariant(incident.status)}>{statusLabel(incident.status)}</Badge>
                            <div className="rounded-xl border border-border bg-background/50 px-4 py-2 text-right backdrop-blur">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Risk score</p>
                                <p className={`text-xl font-semibold ${riskTone(incident.risk_score)}`}>{incident.risk_score}</p>
                            </div>
                        </div>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary/60">
                        <div
                            className={`h-full rounded-full ${incident.risk_score >= 80 ? 'bg-red-500' : incident.risk_score >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${riskProgress}%` }}
                        />
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <article className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Rapports sur ce numero</p>
                    <p className="text-2xl font-semibold">{incident.stats.reports_for_phone}</p>
                </article>
                <article className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Dossiers ouverts</p>
                    <p className="text-2xl font-semibold text-amber-300">{incident.stats.open_reports_for_phone}</p>
                </article>
                <article className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Incidents confirmes</p>
                    <p className="text-2xl font-semibold text-red-300">{incident.stats.confirmed_reports_for_phone}</p>
                </article>
                <article className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Blocages simules</p>
                    <p className="text-2xl font-semibold text-emerald-300">{incident.stats.blocked_reports_for_phone}</p>
                </article>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <article className="rounded-2xl border border-border bg-card p-5">
                        <h2 className="mb-4 text-base font-semibold">Dossier incident</h2>
                        <dl className="grid gap-3 text-sm sm:grid-cols-2">
                            <div className="rounded-lg border border-border/70 bg-secondary/20 p-3">
                                <dt className="text-xs text-muted-foreground">Canal</dt>
                                <dd className="font-medium">{incident.channel === 'MOBILE_APP' ? 'Application mobile' : 'Interface web'}</dd>
                            </div>
                            <div className="rounded-lg border border-border/70 bg-secondary/20 p-3">
                                <dt className="text-xs text-muted-foreground">Date</dt>
                                <dd className="font-medium">{formatDate(incident.created_at)}</dd>
                            </div>
                            <div className="rounded-lg border border-border/70 bg-secondary/20 p-3 sm:col-span-2">
                                <dt className="text-xs text-muted-foreground">Numero suspect</dt>
                                <dd className="font-mono text-xs sm:text-sm">{incident.phone_number}</dd>
                            </div>
                            <div className="rounded-lg border border-border/70 bg-secondary/20 p-3 sm:col-span-2">
                                <dt className="text-xs text-muted-foreground">URL signalee</dt>
                                <dd className="break-all text-xs sm:text-sm">{incident.url || '-'}</dd>
                            </div>
                            <div className="rounded-lg border border-border/70 bg-secondary/20 p-3 sm:col-span-2">
                                <dt className="text-xs text-muted-foreground">Message transmis</dt>
                                <dd className="whitespace-pre-wrap text-sm">{incident.message || '-'}</dd>
                            </div>
                            <div className="rounded-lg border border-border/70 bg-secondary/20 p-3 sm:col-span-2">
                                <dt className="text-xs text-muted-foreground">Note analyste</dt>
                                <dd className="text-sm">{incident.analysis_note || 'Aucune note pour le moment.'}</dd>
                            </div>
                        </dl>
                    </article>

                    <article className="rounded-2xl border border-border bg-card p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-base font-semibold">Captures citoyen</h2>
                            <span className="text-xs text-muted-foreground">{incident.attachments.length} fichier(s)</span>
                        </div>
                        {incident.attachments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aucune capture associee a ce signalement.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {incident.attachments.map((attachment) => (
                                    <AttachmentPreview key={attachment.evidence_id} attachment={attachment} />
                                ))}
                            </div>
                        )}
                    </article>

                    <article className="rounded-2xl border border-border bg-card p-5">
                        <h2 className="mb-4 text-base font-semibold">Incidents lies (meme numero)</h2>
                        {incident.related_incidents.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aucun autre incident lie.</p>
                        ) : (
                            <div className="space-y-2">
                                {incident.related_incidents.map((related) => (
                                    <Link
                                        key={related.alert_uuid}
                                        to={`/incidents-signales/${related.alert_uuid}`}
                                        className="flex items-center justify-between rounded-lg border border-border bg-secondary/15 px-3 py-2 text-xs transition hover:border-primary/40 hover:bg-secondary/30"
                                    >
                                        <span className="font-mono">#{related.alert_uuid.slice(0, 8)}</span>
                                        <span className="text-muted-foreground">{formatDate(related.created_at)}</span>
                                        <Badge variant={statusBadgeVariant(related.status)}>{statusLabel(related.status)}</Badge>
                                        <span className="font-medium">Score {related.risk_score}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </article>
                </div>

                <aside className="space-y-6 xl:sticky xl:top-20 xl:h-fit">
                    <article className="rounded-2xl border border-border bg-card p-5">
                        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
                            <ShieldAlert className="h-4 w-4 text-primary" /> Centre actions operateur (simule)
                        </h2>
                        <p className="mb-4 text-xs text-muted-foreground">
                            Flux soutenance: decision SOC puis orchestration SHIELD vers API operateur simulee.
                        </p>

                        <label className="mb-2 block text-xs text-muted-foreground">Commentaire analyste</label>
                        <textarea
                            value={decisionComment}
                            onChange={(e) => setDecisionComment(e.target.value)}
                            placeholder="Justification, contexte, priorite..."
                            className="mb-3 min-h-24 w-full rounded-xl border border-input bg-secondary/20 p-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                        />

                        <div className="mb-3 grid grid-cols-3 gap-2">
                            <button
                                onClick={() => decisionMutation.mutate({ decision: 'CONFIRM' })}
                                className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-2 text-xs text-emerald-300 transition hover:bg-emerald-500/20"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Confirmer
                            </button>
                            <button
                                onClick={() => decisionMutation.mutate({ decision: 'ESCALATE' })}
                                className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-2 text-xs text-amber-300 transition hover:bg-amber-500/20"
                            >
                                <Siren className="h-3.5 w-3.5" /> Escalader
                            </button>
                            <button
                                onClick={() => decisionMutation.mutate({ decision: 'REJECT' })}
                                className="inline-flex items-center justify-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-2 text-xs text-destructive transition hover:bg-destructive/20"
                            >
                                <ShieldX className="h-3.5 w-3.5" /> Rejeter
                            </button>
                        </div>

                        <label className="mb-2 block text-xs text-muted-foreground">Action playbook</label>
                        <select
                            value={playbookAction}
                            onChange={(e) => setPlaybookAction(e.target.value as PlaybookActionType)}
                            className="mb-3 w-full rounded-xl border border-input bg-secondary/20 p-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                        >
                            {(Object.keys(ACTION_LABELS) as PlaybookActionType[]).map((action) => (
                                <option key={action} value={action}>
                                    {ACTION_LABELS[action]} ({action})
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => dispatchMutation.mutate()}
                            disabled={dispatchMutation.isPending || !canDispatchShield}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                        >
                            {dispatchMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            Declencher action simulee
                        </button>

                        {!canDispatchShield && (
                            <p className="mt-2 text-xs text-muted-foreground">
                                Action SHIELD active uniquement quand le dossier est confirme ou deja bloque simule.
                            </p>
                        )}
                    </article>

                    <article className="rounded-2xl border border-border bg-card p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-base font-semibold">Timeline SHIELD</h2>
                            <button
                                onClick={() => refetchTimeline()}
                                className="inline-flex items-center gap-1 rounded-lg border border-input px-2 py-1 text-xs text-muted-foreground transition hover:bg-secondary/30 hover:text-foreground"
                            >
                                <RefreshCcw className="h-3.5 w-3.5" /> Refresh
                            </button>
                        </div>

                        {timelineLoading ? (
                            <div className="text-xs text-muted-foreground">Chargement timeline...</div>
                        ) : shieldTimeline && shieldTimeline.actions.length > 0 ? (
                            <ol className="space-y-3">
                                {shieldTimeline.actions.map((entry) => (
                                    <li key={entry.dispatch_id} className="rounded-lg border border-border bg-secondary/15 p-3 text-xs">
                                        <div className="mb-1 flex items-center justify-between">
                                            <span className="font-mono">#{entry.dispatch_id.slice(0, 8)}</span>
                                            <Badge variant="outline">{ACTION_LABELS[entry.action_type]}</Badge>
                                        </div>
                                        <div className="grid gap-1 text-muted-foreground">
                                            <span className="inline-flex items-center gap-1">
                                                <ShieldCheck className="h-3.5 w-3.5" /> Operateur: {entry.operator_status}
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <Clock3 className="h-3.5 w-3.5" /> Decision: {entry.decision_status}
                                            </span>
                                            <span>MAJ: {formatDate(entry.updated_at || entry.created_at)}</span>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <div className="text-xs text-muted-foreground">Aucune action SHIELD sur cet incident.</div>
                        )}
                    </article>
                </aside>
            </section>
        </div>
    );
}
