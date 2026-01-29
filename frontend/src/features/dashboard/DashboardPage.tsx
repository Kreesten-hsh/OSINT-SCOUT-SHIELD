import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Activity, Globe, Eye, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: string;
    change: string;
    trend: 'up' | 'down' | 'neutral';
    icon: any;
    className?: string;
}

function StatCard({ title, value, change, trend, icon: Icon, className }: StatCardProps) {
    return (
        <Card className={cn("bg-[#131B24] border-[#1E293B] shadow-lg", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
                <Icon className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white">{value}</div>
                <p className={cn("text-xs flex items-center mt-1",
                    trend === 'up' ? "text-red-400" : trend === 'down' ? "text-green-400" : "text-slate-500"
                )}>
                    {trend === 'up' ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                    {change} <span className="text-slate-500 ml-1">depuis 24h</span>
                </p>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Vue Globale Command Center</h1>
                    <p className="text-slate-400 mt-1">État de la surveillance en temps réel • Zone: Cotonou / Porto-Novo</p>
                </div>
                <div className="bg-blue-900/20 text-blue-400 px-3 py-1 rounded-full text-xs font-mono border border-blue-900/50">
                    SYSTÈME EN LIGNE
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Alertes Critiques"
                    value="12"
                    change="+15%"
                    trend="up"
                    icon={ShieldAlert}
                    className="border-l-4 border-l-red-500"
                />
                <StatCard
                    title="Mentions Détectées"
                    value="1,248"
                    change="+5.2%"
                    trend="up"
                    icon={Activity}
                />
                <StatCard
                    title="Sources Actives"
                    value="45"
                    change="Stable"
                    trend="neutral"
                    icon={Globe}
                />
                <StatCard
                    title="Investigations en Cours"
                    value="3"
                    change="-2"
                    trend="down"
                    icon={Eye}
                />
            </div>

            {/* Placeholder Charts Area */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-[#131B24] border-[#1E293B]">
                    <CardHeader>
                        <CardTitle className="text-white">Tendances des Menaces (7 Jours)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center border-2 border-dashed border-slate-800 rounded-md m-6 relative bg-slate-900/50">
                        <span className="text-slate-500 font-mono text-sm">[GRAPHIQUE D'ACTIVITÉ ICI]</span>
                        {/* TODO: Integrate Recharts here */}
                    </CardContent>
                </Card>

                <Card className="col-span-3 bg-[#131B24] border-[#1E293B]">
                    <CardHeader>
                        <CardTitle className="text-white">Dernières Alertes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center p-3 rounded bg-slate-900/30 border border-slate-800">
                                    <div className="h-2 w-2 rounded-full bg-red-500 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-white">Fuite de données potentielle</p>
                                        <p className="text-xs text-slate-500">Facebook • Il y a 2h</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
