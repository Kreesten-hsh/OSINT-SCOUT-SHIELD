import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { Alert } from "../types/alert";
import { Link } from "react-router-dom";
import { BadgeAlert, CheckCircle, Clock, Search } from "lucide-react";
import { cn } from "../lib/utils";

const fetchAlerts = async () => {
    const response = await apiClient.get<Alert[]>("/alerts/");
    return response.data;
};

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        NEW: "bg-blue-100 text-blue-800 border-blue-200",
        INVESTIGATING: "bg-yellow-100 text-yellow-800 border-yellow-200",
        CLOSED: "bg-green-100 text-green-800 border-green-200",
        FALSE_POSITIVE: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return (
        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", styles[status] || styles.NEW)}>
            {status}
        </span>
    );
};

const RiskBadge = ({ score }: { score: number }) => {
    let color = "bg-green-100 text-green-800 border-green-200";
    if (score >= 50) color = "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (score >= 80) color = "bg-red-100 text-red-800 border-red-200";

    return (
        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border", color)}>
            {score}/100
        </span>
    );
};

export default function DashboardPage() {
    const { data: alerts, isLoading, isError } = useQuery({
        queryKey: ["alerts"],
        queryFn: fetchAlerts,
    });

    if (isLoading) return <div className="p-8 text-center">Chargement des renseignements...</div>;
    if (isError) return <div className="p-8 text-center text-red-600">Erreur de connexion au système SOC.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Menaces Détectées</h1>
                    <p className="text-muted-foreground">Registre centralisé des signaux OSINT.</p>
                </div>
                <div className="flex gap-2">
                    {/* Placeholder pour les futurs filtres */}
                    <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 flex items-center gap-2 text-sm font-medium">
                        <Search className="w-4 h-4" /> Filtrer
                    </button>
                </div>
            </div>

            <div className="border rounded-lg shadow-sm bg-card overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground border-b uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3 font-medium">Date</th>
                            <th className="px-6 py-3 font-medium">Cible / URL</th>
                            <th className="px-6 py-3 font-medium">Score</th>
                            <th className="px-6 py-3 font-medium">Statut</th>
                            <th className="px-6 py-3 font-medium text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {alerts?.map((alert) => (
                            <tr key={alert.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                                    {new Date(alert.created_at).toLocaleDateString()} <br />
                                    <span className="text-xs">{new Date(alert.created_at).toLocaleTimeString()}</span>
                                </td>
                                <td className="px-6 py-4 font-medium max-w-md truncate" title={alert.url}>
                                    <div className="flex items-center gap-2">
                                        {alert.source_type === "WEB" ? <span className="text-blue-500">🌐</span> : <span className="text-indigo-500">👥</span>}
                                        {alert.url}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <RiskBadge score={alert.risk_score} />
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={alert.status} />
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link
                                        to={`/alerts/${alert.uuid}`}
                                        className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                                    >
                                        Investiguer &rarr;
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {alerts?.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                    Aucune menace détectée pour le moment. Le calme avant la tempête ?
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
