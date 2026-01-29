import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Alert } from "@/types/alert";
import { Link } from "react-router-dom";
import { Activity, ShieldAlert, ArrowUpRight, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

const fetchAlerts = async () => {
    const response = await apiClient.get<Alert[]>("/alerts/");
    return response.data;
};

// Mock Data for Charts
const CHART_DATA = [
    { name: "Mon", count: 4 },
    { name: "Tue", count: 7 },
    { name: "Wed", count: 3 },
    { name: "Thu", count: 12 },
    { name: "Fri", count: 9 },
    { name: "Sat", count: 5 },
    { name: "Sun", count: 8 },
];

export default function DashboardPage() {
    const { data: alerts, isLoading } = useQuery({
        queryKey: ["alerts"],
        queryFn: fetchAlerts,
    });

    const activeAlerts = alerts?.filter(a => a.status === "NEW" || a.status === "INVESTIGATING")?.length || 0;
    const criticalAlerts = alerts?.filter(a => a.risk_score > 70)?.length || 0;
    const resolvedStats = alerts?.filter(a => a.status === "CLOSED").length || 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-1">Command Center</h1>
                <p className="text-muted-foreground">Vue d'ensemble de la posture de sécurité.</p>
            </div>

            {/* KPI Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="p-6 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-sm font-medium">Alertes Actives</span>
                        <ShieldAlert className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{activeAlerts}</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <span className="text-red-500 flex items-center"><ArrowUpRight className="w-3 h-3" /> +12%</span> depuis hier
                        </p>
                    </div>
                </Card>

                <Card className="p-6 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-sm font-medium">Menaces Critiques</span>
                        <Activity className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{criticalAlerts}</div>
                        <p className="text-xs text-muted-foreground mt-1">Nécessitent action immédiate</p>
                    </div>
                </Card>

                <Card className="p-6 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-sm font-medium">Résolus (24h)</span>
                        <ShieldCheck className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{resolvedStats}</div>
                        <p className="text-xs text-muted-foreground mt-1">+4 clôturés ce matin</p>
                    </div>
                </Card>

                <Card className="p-6 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-sm font-medium">MTTR (Temps Résol.)</span>
                        <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold">45m</div>
                        <p className="text-xs text-muted-foreground mt-1 text-green-500">-5min vs moyenne</p>
                    </div>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Main Bar Chart */}
                <Card className="col-span-4 p-6">
                    <h3 className="font-semibold mb-6">Volume des Menaces (7 Jours)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={CHART_DATA}>
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }}
                                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                                />
                                <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Recent Alerts Feed (Compact) */}
                <Card className="col-span-3 p-6 flex flex-col">
                    <h3 className="font-semibold mb-4">Live Feed</h3>
                    <div className="flex-1 overflow-auto space-y-4 pr-2">
                        {alerts?.slice(0, 5).map((alert) => (
                            <Link
                                to={`/alerts/${alert.uuid}`}
                                key={alert.id}
                                className="flex items-start gap-4 p-3 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer group"
                            >
                                <div className={cn("w-2 h-2 mt-2 rounded-full", alert.status === "NEW" ? "bg-blue-500" : "bg-gray-500")} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">{alert.url}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={cn("text-xs px-1.5 py-0.5 rounded border",
                                            alert.risk_score > 70 ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"
                                        )}>
                                            Score: {alert.risk_score}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {(!alerts || alerts.length === 0) && (
                            <p className="text-sm text-muted-foreground py-8 text-center">Aucune activité récente.</p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
