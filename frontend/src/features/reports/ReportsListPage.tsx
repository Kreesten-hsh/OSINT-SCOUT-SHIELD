import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, Download, ExternalLink, FileText, Fingerprint, Loader2, RefreshCcw } from 'lucide-react';

import { apiClient } from '@/api/client';
import { riskTone } from '@/lib/presentation';

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

export default function ReportsListPage() {
    const navigate = useNavigate();

    const { data: reports, isLoading, isError, refetch, isFetching } = useQuery({
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
        return { total, withAlert };
    }, [reports]);

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

    return (
        <div className="space-y-5">
            <section className="panel p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="font-display text-2xl font-semibold tracking-tight">Rapports forensiques</h2>
                        <p className="text-sm text-muted-foreground">Snapshots certifies (PDF + JSON) issus des incidents confirmes.</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="metric">
                            <span className="text-muted-foreground">Total: </span>
                            <span className="font-semibold">{summary.total}</span>
                        </div>
                        <div className="metric">
                            <span className="text-muted-foreground">Liables incident: </span>
                            <span className="font-semibold">{summary.withAlert}</span>
                        </div>
                        <button
                            onClick={() => refetch()}
                            className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                        >
                            <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Actualiser
                        </button>
                    </div>
                </div>
            </section>

            {isLoading && (
                <section className="panel flex min-h-56 items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement des rapports...
                </section>
            )}

            {isError && !isLoading && (
                <section className="panel border-destructive/25 bg-destructive/10 p-8 text-center">
                    <p className="text-sm font-semibold text-destructive">Erreur de chargement des rapports.</p>
                    <button onClick={() => refetch()} className="mt-3 rounded-lg border border-destructive/30 px-3 py-2 text-xs text-destructive">
                        Reessayer
                    </button>
                </section>
            )}

            {!isLoading && !isError && (!reports || reports.length === 0) && (
                <section className="panel border-dashed p-10 text-center">
                    <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                    <h2 className="text-lg font-semibold">Aucun rapport genere</h2>
                    <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                        Confirme un incident puis genere un rapport depuis Incidents signales ou Alertes.
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
                            <article key={report.uuid} className="panel p-5 transition hover:border-primary/40">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/30 px-3 py-1 text-xs text-muted-foreground">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {createdAt.toLocaleString()}
                                            </span>
                                            <span className={`text-sm font-semibold ${riskTone(risk)}`}>Risque {risk}</span>
                                            {report.snapshot_version && (
                                                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">v{report.snapshot_version}</span>
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
