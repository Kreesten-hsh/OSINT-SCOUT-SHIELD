import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle2, Download, ExternalLink, Fingerprint, Loader2, Shield } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { Alert } from '@/types';
import PageHero from '@/components/layout/PageHero';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { alertStatusLabel, alertStatusVariant } from '@/lib/presentation';
import { downloadApiFile } from '@/lib/download';

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

function riskBadge(score: number): 'destructive' | 'warning' | 'outline' {
    if (score >= 80) return 'destructive';
    if (score >= 50) return 'warning';
    return 'outline';
}

export default function ReportDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();

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

    const activeReport = useMemo(() => {
        const items = reports ?? [];
        return items.find((report) => report.snapshot_json?.data?.alert?.uuid === id) ?? null;
    }, [reports, id]);

    if (isLoadingAlert) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement du dossier...
            </div>
        );
    }

    if (isAlertError || !alert) {
        return (
            <div className="panel border-destructive/25 bg-destructive/10 p-8 text-center text-destructive">
                Impossible de charger cet incident pour le dossier.
            </div>
        );
    }

    const handleDelete = async () => {
        if (!activeReport?.uuid) {
            return;
        }
        if (!window.confirm('Supprimer ce dossier definitivement ?')) {
            return;
        }
        try {
            await apiClient.delete(`/reports/${activeReport.uuid}/delete`);
            await queryClient.invalidateQueries({ queryKey: ['reports-list'] });
            toast({
                title: 'Dossier supprime',
                description: 'Le dossier a ete retire avec succes.',
            });
            navigate('/admin/dossiers');
        } catch (err) {
            console.error('Suppression echouee', err);
            toast({
                title: 'Suppression impossible',
                description: 'Le dossier n a pas pu etre supprime.',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="mx-auto max-w-5xl space-y-5">
            <PageHero
                title={`Dossier incident #${alert.uuid.slice(0, 8)}`}
                subtitle={alert.url}
                eyebrow={<p className="text-xs uppercase tracking-[0.22em] text-primary/90">Forensic dossier</p>}
                actions={
                    <>
                        <Badge variant={riskBadge(alert.risk_score)}>Risque {alert.risk_score}/100</Badge>
                        <Badge variant={alertStatusVariant(alert.status)}>{alertStatusLabel(alert.status)}</Badge>
                    </>
                }
            />

            <section className="panel p-5 fade-rise-in-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="section-title text-base">Actions du dossier</h2>
                        <p className="text-sm text-muted-foreground">Consultation, export et suppression du dossier forensique.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            to="/admin/dossiers"
                            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-input px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                        >
                            Voir tous les dossiers
                        </Link>
                    </div>
                </div>

                {activeReport ? (
                    <div className="mt-3">
                        <button
                            onClick={handleDelete}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-700 bg-red-900/60 px-4 py-2 text-sm text-red-200 transition-colors hover:bg-red-800"
                        >
                            Supprimer ce dossier
                        </button>
                    </div>
                ) : null}
            </section>

            <section className="panel p-5 fade-rise-in-2">
                <h2 className="section-title mb-3 text-base">Artefact disponible</h2>

                {!activeReport ? (
                    <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-8 text-center">
                        <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">Aucun dossier genere pour cet incident pour le moment.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs text-muted-foreground">ID dossier</p>
                                    <p className="font-mono text-xs">{activeReport.uuid}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Genere le</p>
                                    <p>{format(new Date(activeReport.generated_at), 'dd MMM yyyy HH:mm')}</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                        <Fingerprint className="h-3.5 w-3.5" /> Hash dossier
                                    </p>
                                    <p className="break-all font-mono text-xs">{activeReport.report_hash}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={async () => {
                                    try {
                                        await downloadApiFile(`/reports/${activeReport.uuid}/download/pdf`, `report_${activeReport.uuid}.pdf`);
                                    } catch {
                                        toast({
                                            title: 'Telechargement impossible',
                                            description: 'Le PDF du dossier est indisponible.',
                                            variant: 'destructive',
                                        });
                                    }
                                }}
                                className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25"
                            >
                                <Download className="h-4 w-4" /> Telecharger PDF
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        await downloadApiFile(
                                            `/reports/${activeReport.uuid}/download/case-bundle`,
                                            `dossier_criet_${activeReport.id}.zip`,
                                        );
                                    } catch {
                                        toast({
                                            title: 'Telechargement impossible',
                                            description: 'Le dossier CRIET est indisponible.',
                                            variant: 'destructive',
                                        });
                                    }
                                }}
                                className="inline-flex items-center gap-1 rounded bg-indigo-700 px-3 py-1.5 text-sm text-white transition-colors hover:bg-indigo-600"
                            >
                                Dossier CRIET
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        await downloadApiFile(`/reports/${activeReport.uuid}/download/json`, `report_${activeReport.uuid}.json`);
                                    } catch {
                                        toast({
                                            title: 'Telechargement impossible',
                                            description: 'Le JSON du dossier est indisponible.',
                                            variant: 'destructive',
                                        });
                                    }
                                }}
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
