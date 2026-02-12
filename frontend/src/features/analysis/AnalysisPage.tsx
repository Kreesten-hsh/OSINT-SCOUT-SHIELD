import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ShieldAlert, Activity, Users, Server, BrainCircuit, CheckCircle, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Alert } from '@/types';
import { useNavigate } from 'react-router-dom';

// Interface pour les stats
interface AnalysisStats {
    global_risk_score: number;
    analyzed_count: number;
    top_entities: string[];
    threat_distribution: { name: string; value: number; color: string }[];
}

export default function AnalysisPage() {
    const navigate = useNavigate();

    // 1. Fetch Stats Agrégées
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['analysis-stats'],
        queryFn: async () => {
            try {
                const response = await apiClient.get<AnalysisStats>('/analysis/stats');
                return response.data;
            } catch {
                return null;
            }
        }
    });

    // 2. Fetch Alerts to Validate (Status = IN_REVIEW)
    const { data: pendingAlerts, isLoading: alertsLoading } = useQuery({
        queryKey: ['alerts', 'pending-validation'],
        queryFn: async () => {
            const response = await apiClient.get<Alert[]>('/alerts?status=IN_REVIEW&limit=50');
            return response.data || [];
        }
    });

    // Filter localy for risk score 50-85 logic (from Prompt)
    const validationQueue = pendingAlerts?.filter(a => a.risk_score >= 50) || [];

    if (statsLoading || alertsLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh] animate-pulse">
                <div className="flex flex-col items-center gap-2">
                    <Activity className="w-10 h-10 text-primary animate-spin" />
                    <span className="text-muted-foreground">Chargement des données analytiques...</span>
                </div>
            </div>
        );
    }

    const hasData = stats?.analyzed_count && stats.analyzed_count > 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <BrainCircuit className="w-8 h-8 text-primary" />
                        Centre d'Analyse
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Supervision des détections automatiques et validation humaine.
                    </p>
                </div>
                {/* 
                Removed Fake "Zap" badge. 
                Replacing with Real "Queue Status"
                */}
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/20 rounded-lg border border-border">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Flux: {validationQueue.length} en attente</span>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* CARD 1: SCORE GLOBAL (Keep if real, otherwise maybe Average Risk?) */}
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-muted-foreground font-medium text-sm uppercase tracking-wider">Score Moyen Risque</span>
                        <ShieldAlert className="w-5 h-5 text-primary" />
                    </div>
                    {/* Assuming stats.global_risk_score is real avg from backend */}
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-bold tracking-tight">{stats?.global_risk_score || 0}/100</span>
                    </div>
                    <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-1000"
                            style={{ width: `${stats?.global_risk_score || 0}%` }}
                        />
                    </div>
                </div>

                {/* CARD 2: Volume Traité */}
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-muted-foreground font-medium text-sm uppercase tracking-wider">Analyses Terminées</span>
                        <Server className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="text-4xl font-bold tracking-tight">{stats?.analyzed_count || 0}</span>
                    <p className="text-xs text-muted-foreground mt-2">Dossiers traités par le moteur</p>
                </div>

                {/* CARD 3: VALIDATION QUEUE (REPLACES FAKE ENTITIES) */}
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm hover:border-orange-500/50 transition-colors cursor-pointer group" onClick={() => navigate('/alerts?status=IN_REVIEW')}>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-muted-foreground font-medium text-sm uppercase tracking-wider text-orange-500">À Valider</span>
                        <CheckCircle className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold tracking-tight text-orange-500">{validationQueue.length}</span>
                        <span className="text-sm text-muted-foreground">alertes</span>
                    </div>

                    <div className="mt-4 space-y-2">
                        {validationQueue.slice(0, 2).map(alert => (
                            <div key={alert.id} className="text-xs flex justify-between items-center p-1.5 bg-background rounded border border-border">
                                <span className="truncate max-w-[120px]">{new URL(alert.url).hostname}</span>
                                <span className="font-mono text-orange-500 font-bold">{alert.risk_score}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 text-xs text-primary group-hover:underline flex items-center">
                        Voir la file d'attente <ArrowRight className="w-3 h-3 ml-1" />
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT SPLIT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* CHART (2/3) */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 h-[400px] flex flex-col">
                    <h3 className="font-semibold text-lg mb-6">Distribution des Risques</h3>
                    <div className="flex-1 w-full min-h-0">
                        {hasData && stats?.threat_distribution ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.threat_distribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={120}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.threat_distribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                <Activity className="w-16 h-16 opacity-20 mb-2" />
                                <p className="text-sm">Données insuffisantes.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ACTION / QUEUE DETAILS (1/3) - REPLACES FAKE LOGIC TEXT */}
                <div className="lg:col-span-1 bg-card border border-border rounded-xl p-6 flex flex-col">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Priorités Analyste
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {validationQueue.length > 0 ? (
                            validationQueue.map(alert => (
                                <div key={alert.id} className="p-3 rounded-lg border border-border bg-background hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => navigate(`/alerts/${alert.uuid}`)}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-orange-500 uppercase">Score {alert.risk_score}</span>
                                        <span className="text-[10px] text-muted-foreground">{new Date(alert.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm font-medium truncate" title={alert.url}>{new URL(alert.url).hostname}</p>
                                    <p className="text-xs text-muted-foreground mt-1 truncate">{alert.source_type}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20 text-green-500" />
                                <p className="text-sm">Aucune alerte en attente.</p>
                                <p className="text-xs opacity-70">Le flux est à jour.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
