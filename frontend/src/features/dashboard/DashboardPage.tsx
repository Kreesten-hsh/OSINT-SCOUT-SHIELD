import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, FileBarChart, Globe, Shield, Wifi } from 'lucide-react';

import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth-store';

interface WeeklyStats {
    current_week_count: number;
    delta_percent: number;
}

interface TopAlert {
    id: number;
    uuid: string;
    url: string;
    source_type: string;
    created_at: string;
    risk_score: number;
    status: string;
    title?: string;
}

interface CriticalThreats {
    count: number;
    top_alerts: TopAlert[];
}

interface CountResponse {
    count: number;
}

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);

    const { data: weeklyStats } = useQuery({
        queryKey: ['dashboard', 'weekly'],
        queryFn: async () => {
            try {
                const res = await apiClient.get<WeeklyStats>('/dashboard/stats/weekly');
                return res.data;
            } catch {
                return null;
            }
        },
    });

    const { data: criticalThreats } = useQuery({
        queryKey: ['dashboard', 'critical'],
        queryFn: async () => {
            try {
                const res = await apiClient.get<CriticalThreats>('/dashboard/stats/critical-threats?threshold=85');
                return res.data;
            } catch {
                return null;
            }
        },
    });

    const { data: sourcesData } = useQuery({
        queryKey: ['dashboard', 'sources'],
        queryFn: async () => {
            try {
                const res = await apiClient.get<CountResponse>('/dashboard/stats/sources-active');
                return res.data;
            } catch {
                return null;
            }
        },
    });

    const { data: reportsData } = useQuery({
        queryKey: ['dashboard', 'reports'],
        queryFn: async () => {
            try {
                const res = await apiClient.get<CountResponse>('/dashboard/stats/reports-count');
                return res.data;
            } catch {
                return null;
            }
        },
    });

    const stats = [
        {
            label: 'Alertes (7 jours)',
            value: weeklyStats ? weeklyStats.current_week_count : '-',
            change: weeklyStats ? `${weeklyStats.delta_percent > 0 ? '+' : ''}${weeklyStats.delta_percent}%` : '...',
            isPositive: weeklyStats ? weeklyStats.delta_percent >= 0 : true,
            icon: AlertTriangle,
            color: 'text-amber-500',
        },
        {
            label: 'Menace Critique',
            value: criticalThreats ? criticalThreats.count : '-',
            change: 'Actives (Score >= 85)',
            isPositive: false,
            icon: Shield,
            color: 'text-red-500',
        },
        {
            label: 'Sources Actives',
            value: sourcesData ? sourcesData.count : '-',
            change: 'Monitoring On',
            isPositive: true,
            icon: Wifi,
            color: 'text-emerald-500',
        },
        {
            label: 'Rapports Generes',
            value: reportsData ? reportsData.count : '-',
            change: 'Certifies',
            isPositive: true,
            icon: FileBarChart,
            color: 'text-blue-500',
        },
    ];

    return (
        <div className="animate-in space-y-8 fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard SOC</h1>
                    <p className="mt-1 text-muted-foreground">
                        Bienvenue, <span className="font-semibold text-foreground">{user?.full_name || user?.email}</span>.
                        Voici la situation forensique actuelle (espace analyste/admin).
                    </p>
                </div>
                <div className="flex animate-pulse items-center space-x-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="uppercase tracking-wider text-emerald-500">Systeme Operationnel</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="rounded-xl border border-input bg-card p-6 transition-colors hover:bg-accent/5"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                <h4 className="mt-2 text-2xl font-bold">{stat.value}</h4>
                            </div>
                            <div className={`rounded-full border border-input bg-background p-3 ${stat.color}`}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs">
                            <span className={stat.isPositive ? 'font-medium text-emerald-500' : 'font-medium text-red-500'}>
                                {stat.change}
                            </span>
                            <span className="ml-2 text-muted-foreground">{index === 0 ? 'vs semaine derniere' : ''}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
                <div className="rounded-xl border border-input bg-card p-6 lg:col-span-4">
                    <h3 className="mb-6 flex items-center text-lg font-semibold">
                        <Activity className="mr-2 h-5 w-5 text-primary" />
                        Menaces critiques actives (Top 3)
                    </h3>

                    <div className="space-y-4">
                        {criticalThreats?.top_alerts && criticalThreats.top_alerts.length > 0 ? (
                            criticalThreats.top_alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className="group flex cursor-pointer items-center justify-between rounded-lg border border-input bg-background p-4 transition-colors hover:border-primary/50"
                                    onClick={() => {
                                        window.location.href = `/alerts/${alert.uuid}`;
                                    }}
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="rounded-full bg-red-500/10 p-2 text-red-500">
                                            <AlertTriangle className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium transition-colors group-hover:text-primary">
                                                {alert.title || alert.url || 'Menace detectee'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {alert.source_type} • {new Date(alert.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-500">
                                            Score {alert.risk_score}
                                        </span>
                                        <span className="text-xs uppercase text-muted-foreground">{alert.status}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-10 text-center text-muted-foreground">
                                <Shield className="mx-auto mb-3 h-10 w-10 opacity-20" />
                                <p>Aucune menace critique active.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center rounded-xl border border-input bg-card p-6 text-center lg:col-span-3">
                    <Globe className="mb-4 h-16 w-16 animate-pulse text-primary/20" />
                    <h3 className="text-lg font-semibold">Carte des Menaces</h3>
                    <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                        La visualisation geographique necessite le module GeoIP (Lot 9).
                    </p>
                    <button className="mt-6 cursor-not-allowed rounded-lg border px-4 py-2 text-sm font-medium opacity-50">
                        Ouvrir la War Room (Bientot)
                    </button>
                </div>
            </div>
        </div>
    );
}
