import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, Download, ExternalLink, FileText, Fingerprint, Loader2, RefreshCcw } from 'lucide-react';

import { apiClient } from '@/api/client';

interface ReportListItem {
    id: number;
    uuid: string;
    alert_id: number;
    report_hash: string;
    snapshot_hash_sha256?: string;
    snapshot_version?: string;
    pdf_path: string;
    generated_at: string;
    snapshot_json?: {
        data?: {
            alert?: {
                uuid?: string;
                url?: string;
                risk_score?: number;
                source_type?: string;
            };
        };
    };
}

function riskTone(score: number): string {
    if (score >= 80) return 'text-red-400';
    if (score >= 50) return 'text-amber-300';
    return 'text-emerald-300';
}

export default function ReportsListPage() {
    const navigate = useNavigate();

    const {
        data: reports,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useQuery({
        queryKey: ['reports-list'],
        queryFn: async () => {
            const response = await apiClient.get<ReportListItem[]>('/reports/');
            return response.data || [];
        },
    });

    const summary = useMemo(() => {
        const items = reports ?? [];
        const total = items.length;
        const withAlert = items.filter((r) => !!r.snapshot_json?.data?.alert?.uuid).length;
        const latest = items[0]?.generated_at ?? null;
        return { total, withAlert, latest };
    }, [reports]);

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/10 p-6">
                <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative z-10">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-primary/90">Forensic Center</p>
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Rapports forensiques</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Documents probants generes depuis les incidents confirmes.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-border/80 bg-background/60 px-4 py-3 backdrop-blur">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
                                <p className="text-xl font-semibold">{summary.total}</p>
                            </div>
                            <div className="rounded-xl border border-border/80 bg-background/60 px-4 py-3 backdrop-blur">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Liables incident</p>
                                <p className="text-xl font-semibold">{summary.withAlert}</p>
                            </div>
                            <div className="rounded-xl border border-border/80 bg-background/60 px-4 py-3 backdrop-blur">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Dernier</p>
                                <p className="text-sm font-medium text-foreground/90">
                                    {summary.latest ? new Date(summary.latest).toLocaleDateString() : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">
                    Genere un rapport depuis <span className="font-semibold text-foreground">Incidents signales</span> ou
                    <span className="font-semibold text-foreground"> Alertes</span> apres confirmation.
                </p>
                <button
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                >
                    <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Actualiser
                </button>
            </section>

            {isLoading && (
                <section className="flex min-h-56 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement des rapports...
                </section>
            )}

            {isError && !isLoading && (
                <section className="rounded-2xl border border-destructive/25 bg-destructive/10 p-8 text-center">
                    <p className="text-sm font-semibold text-destructive">Erreur de chargement des rapports.</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-3 rounded-lg border border-destructive/30 px-3 py-2 text-xs text-destructive"
                    >
                        Reessayer
                    </button>
                </section>
            )}

            {!isLoading && !isError && (!reports || reports.length === 0) && (
                <section className="rounded-2xl border border-dashed border-border bg-card/70 p-10 text-center">
                    <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                    <h2 className="text-lg font-semibold">Aucun rapport genere</h2>
                    <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                        Confirme un incident puis clique sur <strong>Generer rapport</strong> depuis
                        <strong> Incidents signales</strong> ou <strong>Alertes</strong>.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-3">
                        <button
                            onClick={() => navigate('/incidents-signales')}
                            className="rounded-lg border border-primary/30 bg-primary/15 px-3 py-2 text-sm font-medium text-primary"
                        >
                            Ouvrir Incidents signales
                        </button>
                        <button
                            onClick={() => navigate('/alerts')}
                            className="rounded-lg border border-input px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                        >
                            Ouvrir Alertes
                        </button>
                    </div>
                </section>
            )}

            {!isLoading && !isError && reports && reports.length > 0 && (
                <section className="space-y-3">
                    {reports.map((report) => {
                        const alert = report.snapshot_json?.data?.alert;
                        const alertUuid = alert?.uuid;
                        const target = alert?.url || 'Incident sans URL (signal textuel)';
                        const risk = alert?.risk_score || 0;
                        const createdAt = new Date(report.generated_at);

                        return (
                            <article
                                key={report.uuid}
                                className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-[0_10px_32px_-16px_rgba(13,147,242,0.5)]"
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/30 px-3 py-1 text-xs text-muted-foreground">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {createdAt.toLocaleString()}
                                            </span>
                                            <span className={`text-sm font-semibold ${riskTone(risk)}`}>Risque {risk}</span>
                                            {report.snapshot_version && (
                                                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                                                    v{report.snapshot_version}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="max-w-3xl truncate text-base font-semibold" title={target}>
                                            {target}
                                        </h3>

                                        <p className="font-mono text-xs text-muted-foreground" title={report.report_hash}>
                                            <Fingerprint className="mr-1 inline h-3.5 w-3.5" />
                                            {report.report_hash}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => window.open(`${apiBase}/reports/${report.uuid}/download/pdf`, '_blank')}
                                            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/25"
                                        >
                                            <Download className="h-3.5 w-3.5" /> PDF
                                        </button>
                                        <button
                                            onClick={() => window.open(`${apiBase}/reports/${report.uuid}/download/json`, '_blank')}
                                            className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" /> JSON
                                        </button>
                                        {alertUuid && (
                                            <button
                                                onClick={() => navigate(`/reports/${alertUuid}`)}
                                                className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                                            >
                                                <FileText className="h-3.5 w-3.5" /> Ouvrir dossier
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}
        </div>
    );
}
