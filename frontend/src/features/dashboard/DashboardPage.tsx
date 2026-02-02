import { Shield, Activity, Globe, Wifi, FileBarChart, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);

    // Queries
    const { data: weeklyStats } = useQuery({
        queryKey: ['dashboard', 'weekly'],
        queryFn: async () => {
            // Returning mock if fail, or handle error gracefully
            try {
                const res = await apiClient.get('/dashboard/stats/weekly');
                return res.data;
            } catch (e) {
                return null;
            }
        }
    });

    const { data: criticalThreats } = useQuery({
        queryKey: ['dashboard', 'critical'],
        queryFn: async () => {
            try {
                const res = await apiClient.get('/dashboard/stats/critical-threats?threshold=85');
                return res.data;
            } catch (e) {
                return null;
            }
        }
    });

    const { data: sourcesData } = useQuery({
        queryKey: ['dashboard', 'sources'],
        queryFn: async () => {
            try {
                const res = await apiClient.get('/dashboard/stats/sources-active');
                return res.data;
            } catch (e) {
                return null;
            }
        }
    });

    const { data: reportsData } = useQuery({
        queryKey: ['dashboard', 'reports'],
        queryFn: async () => {
            try {
                const res = await apiClient.get('/dashboard/stats/reports-count');
                return res.data;
            } catch (e) {
                return null;
            }
        }
    });

    const stats = [
        {
            label: "Alertes (7 jours)",
            value: weeklyStats ? weeklyStats.current_week_count : "-",
            change: weeklyStats ? `${weeklyStats.delta_percent > 0 ? '+' : ''}${weeklyStats.delta_percent}%` : "...",
            isPositive: weeklyStats ? weeklyStats.delta_percent >= 0 : true,
            icon: AlertTriangle,
            color: "text-amber-500"
        },
        {
            label: "Menace Critique",
            value: criticalThreats ? criticalThreats.count : "-",
            change: "Actives (Score ≥ 85)",
            isPositive: false,
            icon: Shield,
            color: "text-red-500"
        },
        {
            label: "Sources Actives",
            value: sourcesData ? sourcesData.count : "-",
            change: "Monitoring On",
            isPositive: true,
            icon: Wifi,
            color: "text-emerald-500"
        },
        {
            label: "Rapports Générés",
            value: reportsData ? reportsData.count : "-",
            change: "Certifiés",
            isPositive: true,
            icon: FileBarChart,
            color: "text-blue-500"
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Bienvenue, <span className="font-semibold text-foreground">{user?.full_name || user?.email}</span>.
                        Voici la situation forensique actuelle.
                    </p>
                </div>
                <div className="flex items-center space-x-2 bg-card border px-3 py-1.5 rounded-full text-xs font-medium animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-emerald-500 uppercase tracking-wider">Système Opérationnel</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="p-6 rounded-xl border border-input bg-card hover:bg-accent/5 transition-colors"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                <h4 className="text-2xl font-bold mt-2">{stat.value}</h4>
                            </div>
                            <div className={`p-3 rounded-full bg-background border-input border ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs">
                            <span className={stat.isPositive ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
                                {stat.change}
                            </span>
                            <span className="text-muted-foreground ml-2">
                                {index === 0 ? "vs semaine dernière" : ""}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Critical Threats */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                <div className="lg:col-span-4 rounded-xl border border-input bg-card p-6">
                    <h3 className="text-lg font-semibold mb-6 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-primary" />
                        Menaces Critiques Actives (Top 3)
                    </h3>

                    <div className="space-y-4">
                        {criticalThreats && criticalThreats.top_alerts && criticalThreats.top_alerts.length > 0 ? (
                            criticalThreats.top_alerts.map((alert: any) => (
                                <div key={alert.id} className="flex items-center justify-between p-4 rounded-lg border border-input bg-background hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => window.location.href = `/alerts/${alert.uuid}`}>
                                    <div className="flex items-center space-x-4">
                                        <div className="p-2 rounded-full bg-red-500/10 text-red-500">
                                            <AlertTriangle className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium group-hover:text-primary transition-colors">{alert.title || alert.url || "Menace Détectée"}</p>
                                            <p className="text-xs text-muted-foreground">{alert.source_type} • {new Date(alert.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                                            Score {alert.risk_score}
                                        </span>
                                        <span className="text-xs text-muted-foreground uppercase">{alert.status}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p>Aucune menace critique active.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-3 rounded-xl border border-input bg-card p-6 flex flex-col items-center justify-center text-center">
                    <Globe className="w-16 h-16 text-primary/20 mb-4 animate-pulse" />
                    <h3 className="text-lg font-semibold">Carte des Menaces</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                        La visualisation géographique nécessite le module GeoIP (Lot 9).
                    </p>
                    <button className="mt-6 px-4 py-2 text-sm font-medium border rounded-lg opacity-50 cursor-not-allowed">
                        Ouvrir la War Room (Bientôt)
                    </button>
                </div>
            </div>
        </div>
    );
}
