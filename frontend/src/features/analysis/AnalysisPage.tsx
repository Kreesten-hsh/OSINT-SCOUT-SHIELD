import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ShieldAlert, Activity, Users, AlertTriangle, Zap, Server, BrainCircuit } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';

// Interface pour les stats (match le backend analysis.py)
interface AnalysisStats {
    global_risk_score: number;
    analyzed_count: number;
    top_entities: string[];
    threat_distribution: { name: string; value: number; color: string }[];
}

export default function AnalysisPage() {
    // 1. Fetch Stats Agrégées
    const { data: stats, isLoading, isError } = useQuery({
        queryKey: ['analysis-stats'],
        queryFn: async () => {
            const response = await apiClient.get<AnalysisStats>('/analysis/stats');
            return response.data;
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh] animate-pulse">
                <div className="flex flex-col items-center gap-2">
                    <Activity className="w-10 h-10 text-primary animate-spin" />
                    <span className="text-muted-foreground">Calibration du moteur d'analyse...</span>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center h-[50vh] text-destructive">
                <AlertTriangle className="w-6 h-6 mr-2" />
                Erreur de récupération des données analytiques.
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
                        Centre d'Analyse Automatisée
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Traitement heuristique et visualisation des menaces en temps réel.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/20 rounded-lg border border-border">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">Moteur Inférence: Actif (v2.1)</span>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm hover:border-primary/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-muted-foreground font-medium text-sm text-transform uppercase tracking-wider">Score Global de Risque</span>
                        <ShieldAlert className="w-5 h-5 text-primary" />
                    </div>
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

                <div className="p-6 rounded-xl border border-border bg-card shadow-sm hover:border-primary/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-muted-foreground font-medium text-sm text-transform uppercase tracking-wider">Dossiers Traités</span>
                        <Server className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="text-4xl font-bold tracking-tight">{stats?.analyzed_count || 0}</span>
                    <p className="text-xs text-muted-foreground mt-2">Depuis le dernier reboot système</p>
                </div>

                <div className="p-6 rounded-xl border border-border bg-card shadow-sm hover:border-primary/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-muted-foreground font-medium text-sm text-transform uppercase tracking-wider">Entités Critiques</span>
                        <Users className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="space-y-2 mt-2">
                        {stats?.top_entities?.length ? stats.top_entities.map((entity, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <AlertTriangle className="w-3 h-3 text-destructive" />
                                <span className="font-mono bg-secondary/30 px-1.5 rounded">{entity}</span>
                            </div>
                        )) : (
                            <span className="text-sm text-muted-foreground italic">En attente de détection...</span>
                        )}
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT SPLIT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* CHART */}
                <div className="bg-card border border-border rounded-xl p-6 h-[400px] flex flex-col w-full min-w-0"> {/* added w-full min-w-0 */}
                    <h3 className="font-semibold text-lg mb-6">Répartition par Niveau de Menace</h3>
                    <div className="flex-1 w-full h-full relative min-h-[300px]"> {/* added h-full min-h */}
                        {hasData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.threat_distribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
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
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                                <PieChart className="w-16 h-16 opacity-20 mb-2" />
                                <p className="text-sm">Données insuffisantes pour la projection.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* EXPLICATION DU MOTEUR (Static for transparency) */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Logique de Décision (Whitelist / Blacklist)
                    </h3>
                    <div className="space-y-4 text-sm text-muted-foreground">
                        <p>
                            Le moteur d'analyse utilise une approche déterministe basée sur des règles strictes pour éviter les faux positifs.
                        </p>

                        <div className="space-y-2">
                            <div className="p-3 bg-secondary/10 rounded-lg border border-border">
                                <span className="font-semibold text-green-500">Règle #102 :</span>
                                <span className="ml-2">Détection de mots-clés "Urgence" + "Paiement" dans le DOM.</span>
                            </div>
                            <div className="p-3 bg-secondary/10 rounded-lg border border-border">
                                <span className="font-semibold text-orange-500">Règle #205 :</span>
                                <span className="ml-2">Analyse de la date de création du domaine (Whois &lt; 30 jours).</span>
                            </div>
                            <div className="p-3 bg-secondary/10 rounded-lg border border-border">
                                <span className="font-semibold text-red-500">Règle #300 :</span>
                                <span className="ml-2">Présence de formulaires de saisie de CB sur connexion non-sécurisée.</span>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-md">
                            <p className="text-xs font-mono text-primary">
                                System Status: OPTIMAL<br />
                                Last Model Update: 2026-01-29 14:00 UTC
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
