import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle2, Download, ExternalLink, FileText, Fingerprint, Loader2, Shield, TriangleAlert } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import type { Alert } from '@/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { alertStatusLabel, alertStatusVariant } from '@/lib/presentation';

interface ReportListItem {
    id: number;
    uuid: string;
    report_hash: string;
    snapshot_hash_sha256?: string;
    snapshot_version?: string;
    generated_at: string;
    snapshot_json?: {
        data?: {
            alert?: {
                uuid?: string;
            };
        };
    };
}

interface GeneratedReportData {
    id: number;
    uuid: string;
    report_hash: string;
    snapshot_hash_sha256: string;
    snapshot_version: string;
    generated_at: string;
    pdf_path: string;
}

function riskBadge(score: number): 'destructive' | 'warning' | 'outline' {
    if (score >= 80) return 'destructive';
    if (score >= 50) return 'warning';
    return 'outline';
}

export default function ReportDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [lastGeneratedReport, setLastGeneratedReport] = useState<GeneratedReportData | null>(null);

    const { data: alert, isLoading: isLoadingAlert, isError: isAlertError } = useQuery({
        queryKey: ['alert-detail', id],
        queryFn: async () => {
            const response = await apiClient.get<Alert>(`/alerts/${id}`);
            return response.data;
        },
        enabled: !!id,
    });

    const { data: reports } = useQuery({
        queryKey: ['reports-list'],
        queryFn: async () => {
            const response = await apiClient.get<ReportListItem[]>('/reports/');
            return response.data || [];
        },
    });

    const existingReport = useMemo(() => {
        const items = reports ?? [];
        return items.find((r) => r.snapshot_json?.data?.alert?.uuid === id) ?? null;
    }, [reports, id]);

    const generateMutation = useMutation({
        mutationFn: async () => {
            if (!id) {
                throw new Error('Incident introuvable');
            }
            const response = await apiClient.post<APIResponse<GeneratedReportData>>(`/reports/generate/${id}`);
            return response.data;
        },
        onSuccess: (response) => {
            if (!response.success || !response.data) {
                toast({
                    title: 'Erreur generation rapport',
                    description: response.message || 'Impossible de generer le rapport.',
                    variant: 'destructive',
                });
                return;
            }

            setLastGeneratedReport(response.data);
            queryClient.invalidateQueries({ queryKey: ['reports-list'] });
            toast({
                title: 'Rapport forensique genere',
                description: 'Le rapport est disponible et telechargeable.',
            });
        },
        onError: () => {
            toast({
                title: 'Erreur generation rapport',
                description: 'Impossible de generer le rapport pour cet incident.',
                variant: 'destructive',
            });
        },
    });

    const activeReport = lastGeneratedReport ?? existingReport;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

    if (isLoadingAlert) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement dossier rapport...
            </div>
        );
    }

    if (isAlertError || !alert) {
        return (
            <div className="panel border-destructive/25 bg-destructive/10 p-8 text-center text-destructive">
                Impossible de charger cet incident pour le rapport.
            </div>
        );
    }

    const canGenerate = alert.status === 'CONFIRMED' || alert.status === 'BLOCKED_SIMULATED';

    return (
        <div className="mx-auto max-w-5xl space-y-5">
            <section className="panel p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-primary/90">Forensic dossier</p>
                        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Rapport incident #{alert.uuid.slice(0, 8)}</h1>
                        <p className="mt-1 text-sm text-muted-foreground break-all">{alert.url}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={riskBadge(alert.risk_score)}>Risque {alert.risk_score}/100</Badge>
                        <Badge variant={alertStatusVariant(alert.status)}>{alertStatusLabel(alert.status)}</Badge>
                    </div>
                </div>
            </section>

            <section className="panel p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-base font-semibold">Generation forensique</h2>
                        <p className="text-sm text-muted-foreground">Snapshot certifie (hash SHA-256) + PDF telechargeable.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => generateMutation.mutate()}
                            disabled={generateMutation.isPending || !canGenerate}
                            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-50"
                        >
                            {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                            Generer rapport
                        </button>
                        <Link
                            to="/reports"
                            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-input px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                        >
                            Voir tous les rapports
                        </Link>
                    </div>
                </div>

                {!canGenerate && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                        <TriangleAlert className="h-3.5 w-3.5" />
                        Le dossier doit etre confirme ou bloque (simule) avant generation.
                    </div>
                )}
            </section>

            <section className="panel p-5">
                <h2 className="mb-3 text-base font-semibold">Artefact disponible</h2>

                {!activeReport ? (
                    <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-8 text-center">
                        <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">Aucun rapport genere pour cet incident pour le moment.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs text-muted-foreground">ID rapport</p>
                                    <p className="font-mono text-xs">{activeReport.uuid}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Genere le</p>
                                    <p>{format(new Date(activeReport.generated_at), 'dd MMM yyyy HH:mm')}</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                        <Fingerprint className="h-3.5 w-3.5" /> Hash rapport
                                    </p>
                                    <p className="break-all font-mono text-xs">{activeReport.report_hash}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => window.open(`${apiBase}/reports/${activeReport.uuid}/download/pdf`, '_blank')}
                                className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25"
                            >
                                <Download className="h-4 w-4" /> Telecharger PDF
                            </button>
                            <button
                                onClick={() => window.open(`${apiBase}/reports/${activeReport.uuid}/download/json`, '_blank')}
                                className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                            >
                                <ExternalLink className="h-4 w-4" /> Ouvrir JSON
                            </button>
                            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Certifie
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
