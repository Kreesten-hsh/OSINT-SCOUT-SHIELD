import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { FileText, Calendar, Search, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react'; // ShieldCheck, AlertTriangle importés au cas où
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Alert {
    uuid: string;
    url: string;
    source_type: string;
    status: string;
    risk_score: number;
    created_at: string;
    updated_at?: string;
}

export default function ReportsListPage() {
    const navigate = useNavigate();

    const { data: reports, isLoading, isError } = useQuery({
        queryKey: ['reports-list'],
        queryFn: async () => {
            const response = await apiClient.get<Alert[]>('/reports/');
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
                        <p className="text-muted-foreground">Aucun rapport disponible (Traitez des alertes d'abord).</p>
                    </div>
                ) : (
                    reports.map((report) => (
                        <div
                            key={report.uuid}
                            onClick={() => navigate(`/reports/${report.uuid}`)}
                            className="group flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary/50 hover:bg-secondary/10 cursor-pointer transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-secondary/50 rounded-md">
                                    <FileText className="w-5 h-5 text-foreground" />
                                </div>
                                <div>
                                    <h3 className="font-mono text-sm font-semibold truncate max-w-[300px] md:max-w-[500px]">
                                        {report.url}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(report.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded font-medium ${report.risk_score > 70 ? 'bg-red-500/10 text-red-500' :
                                            report.risk_score > 30 ? 'bg-orange-500/10 text-orange-500' :
                                                'bg-green-500/10 text-green-500'
                                            }`}>
                                            Score: {report.risk_score}/100
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
