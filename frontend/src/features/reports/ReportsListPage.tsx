import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { FileText, Calendar, ArrowRight, Fingerprint, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Report {
    uuid: string;
    alert_id: number;
    report_hash: string;
    pdf_path: string;
    generated_at: string;
    // Certification info
    snapshot_version?: string;
    snapshot_hash_sha256?: string;
    generated_by?: string;
    // Snapshot info
    snapshot_json: {
        data: {
            alert: {
                uuid: string;
                url: string;
                risk_score: number;
                source_type: string;
            }
        }
    }
}

export default function ReportsListPage() {
    const navigate = useNavigate();

    const { data: reports, isLoading, isError } = useQuery({
        queryKey: ['reports-list'],
        queryFn: async () => {
            const response = await apiClient.get<Report[]>('/reports/');
            return response.data || [];
        }
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    Rapports Forensiques
                </h1>
                <p className="text-muted-foreground mt-1">
                    Archives des dossiers traités et génération de documents probants.
                </p>
            </div>

            <div className="grid gap-4">
                {isLoading ? (
                    <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                        <Calendar className="w-6 h-6 animate-pulse" />
                        Chargement des archives...
                    </div>
                ) : isError ? (
                    <div className="text-center py-10 text-destructive border border-destructive/20 rounded-lg bg-destructive/5">
                        <p className="font-semibold">Erreur de chargement</p>
                        <p className="text-sm">Impossible de récupérer les rapports.</p>
                    </div>
                ) : (!reports || reports.length === 0) ? (
                    <div className="text-center py-20 border border-dashed rounded-lg bg-secondary/5">
                        <Fingerprint className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground">Aucun rapport généré</h3>
                        <p className="text-sm text-muted-foreground/70 max-w-sm mx-auto mt-2">
                            Pour créer un rapport, allez sur une alerte "Analysée" ou "Confirmée" et cliquez sur "Générer Rapport Forensique".
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={() => navigate('/alerts')}
                                className="text-primary hover:underline font-medium text-sm"
                            >
                                Aller aux Alertes →
                            </button>
                        </div>
                    </div>
                ) : (
                    reports.map((report) => {
                        const alertSnapshot = report.snapshot_json?.data?.alert;
                        // Fallback safe navigation
                        const targetUrl = alertSnapshot?.url || "URL Inconnue";
                        const risk = alertSnapshot?.risk_score || 0;

                        return (
                            <div
                                key={report.uuid}
                                onClick={() => {
                                    // IMPORTANT: On navigue vers la page de DETAIL de l'ALERT, 
                                    // mais comme on n'a pas l'UUID de l'Alert facilement accessible dans l'URL de la liste
                                    // (on a l'ID num de l'alert dans report.alert_id mais pas son UUID stocké plat),
                                    // IDEALEMENT: Il nous faut l'UUID de l'alerte pour naviguer vers /reports/{alert_uuid}
                                    // OU BIEN on change la route pour /reports/artifact/{report_uuid}.
                                    // MAIS pour respecter le flow actuel 'ReportDetailPage' qui prend un ALERT UUID...
                                    // => On va utiliser l'UUID de l'alerte stocké dans le snapshot !
                                    if (alertSnapshot?.uuid) {
                                        navigate(`/reports/${alertSnapshot.uuid}`);
                                    } else {
                                        console.error("Snapshot missing alert UUID", report);
                                    }
                                }}
                                className="group flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-400 hover:shadow-md cursor-pointer transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white border border-slate-200 rounded-full shadow-sm">
                                        <Lock className="w-5 h-5 text-slate-700" />
                                    </div>
                                    <div>
                                        <h3 className="font-mono text-sm font-bold text-slate-900 truncate max-w-[300px] md:max-w-[500px]">
                                            {targetUrl}
                                        </h3>
                                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Généré le {format(new Date(report.generated_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                                            </span>
                                            <span className="font-mono bg-slate-200 px-1 rounded flex items-center gap-1" title={report.report_hash}>
                                                <Fingerprint className="w-3 h-3" />
                                                {report.report_hash.substring(0, 8)}...
                                            </span>
                                            {report.snapshot_version && (
                                                <span className="bg-slate-100 text-slate-500 px-1.5 rounded border border-slate-200 text-[10px]">
                                                    v{report.snapshot_version}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className={`px-2 py-1 rounded font-bold text-xs ${risk > 70 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                        Risque {risk}
                                    </span>
                                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-900 transition-colors" />
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
}

