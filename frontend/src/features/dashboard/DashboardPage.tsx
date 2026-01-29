import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Alert } from '@/types';
import { ShieldAlert, CheckCircle, Activity, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
    // Fetch all alerts to calculate stats
    // Ideally backend provides a /stats endpoint, but prompt says "GET /api/v1/alerts"
    const { data: alerts, isLoading, error } = useQuery({
        queryKey: ['alerts'],
        queryFn: async () => {
            const response = await apiClient.get<Alert[]>('/alerts'); // Assuming array return or { items: [] }
            // Handling both potential structures for robustness
            if (Array.isArray(response.data)) return response.data;
            return (response.data as any).items || [];
        }
    });

    if (isLoading) return <div className="text-center py-20 text-muted-foreground animate-pulse">Chargement du Command Center...</div>;
    if (error) return <div className="text-center py-20 text-destructive">Erreur de chargement des données.</div>;

    const total = alerts?.length || 0;
    const critical = alerts?.filter(a => a.severity === 'CRITICAL').length || 0;
    const newAlerts = alerts?.filter(a => a.status === 'NEW').length || 0;
    const closed = alerts?.filter(a => a.status === 'CLOSED').length || 0;

    // Prepare chart data (Alerts by Date - Last 7 days mock or derived)
    const chartData = [
        { name: 'Lun', alerts: 4 },
        { name: 'Mar', alerts: 7 },
        { name: 'Mer', alerts: 3 },
        { name: 'Jeu', alerts: 10 },
        { name: 'Ven', alerts: 5 },
        { name: 'Sam', alerts: 2 },
        { name: 'Dim', alerts: 1 },
    ];

    const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground font-medium text-sm">{title}</span>
                <div className={`p-2 rounded-lg bg-${color}/10 text-${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <div>
                <span className="text-3xl font-bold tracking-tight">{value}</span>
                {trend && <span className="text-xs text-muted-foreground ml-2">{trend}</span>}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Vue Globale (Command Center)</h1>
                <div className="text-sm text-muted-foreground">
                    Dernière mise à jour: {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Alertes Actives" value={total} icon={Activity} color="primary" trend="+12% cette semaine" />
                <StatCard title="Menaces Critiques" value={critical} icon={ShieldAlert} color="destructive" trend="Priorité Haute" />
                <StatCard title="Nouvelles Détections" value={newAlerts} icon={AlertTriangle} color="accent" trend="Depuis 24h" />
                <StatCard title="Incidents Résolus" value={closed} icon={CheckCircle} color="green-500" trend="Total cumulé" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                {/* CHART */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-6">Tendance des Menaces</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={chartData}>
                            <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Bar dataKey="alerts" fill="#0D93F2" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* ACTIVITY FEED */}
                <div className="bg-card border border-border rounded-xl p-6 overflow-hidden flex flex-col">
                    <h3 className="text-lg font-semibold mb-4">Activité Récente</h3>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {alerts?.slice(0, 5).map((alert) => (
                            <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-transparent hover:border-border">
                                <div className={`w-2 h-2 mt-2 rounded-full ${alert.severity === 'CRITICAL' ? 'bg-destructive' : 'bg-primary'}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{alert.url}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground capitalize">{alert.source_type}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
                                            Score: {alert.risk_score}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
