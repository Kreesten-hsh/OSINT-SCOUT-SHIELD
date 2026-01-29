import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Alert } from "@/types/alert";
import { Link } from "react-router-dom";

// Mock data pour simuler le flux comme dans le design code.html
// En production, on utiliserait les props ou WebSocket
const MOCK_FEED_ITEMS = [
    { id: 8821, file: "185.220.101.44", country: "FR", msg: "Unauthorized login detected from TOR exit node.", level: "CRITICAL", time: "JUST NOW", color: "text-red-500", border: "border-red-500" },
    { id: 8819, file: "mycompany-secure.it", country: "", msg: "Fraudulent landing page detected targeting 'Employee-Portal'.", level: "HIGH", time: "2m AGO", color: "text-orange-500", border: "border-orange-500" },
    { id: 8815, file: "breach-forum.onion", country: "", msg: "DarkWeb mention found for keyword 'Internal-Roadmap-2024'.", level: "MEDIUM", time: "8m AGO", color: "text-blue-500", border: "border-blue-500" },
    { id: 8812, file: "45.2.19.201", country: "CN", msg: "Mass API scraping detected on /v1/user/search endpoint.", level: "HIGH", time: "15m AGO", color: "text-orange-500", border: "border-orange-500" },
];

export function LiveFeedSidebar({ alerts }: { alerts?: Alert[] }) {
    // Note: Pour l'instant on affiche les Mocks du design pour matcher la maquette,
    // puis on mélangera avec les vraies alertes.

    return (
        <aside className="w-80 flex flex-col border-l border-border bg-background/80 backdrop-blur-md shrink-0 hidden xl:flex">
            <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        Live Threat Feed
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Streaming Updates</p>
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="divide-y divide-border">
                    {/* Items du Design (Mocks) pour l'effet "Wow" immédiat */}
                    {MOCK_FEED_ITEMS.map((item) => (
                        <div key={item.id} className={cn("p-4 border-l-2 relative group cursor-pointer hover:bg-muted/10 transition-colors", item.border)}>
                            <div className="flex justify-between items-start mb-1">
                                <span className={cn("text-[10px] font-bold uppercase tracking-tighter", item.color)}>{item.level} • {item.time}</span>
                                <span className="text-[10px] text-muted-foreground">#{item.id}</span>
                            </div>
                            <p className="text-xs font-bold mb-2 leading-tight">{item.msg}</p>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-[10px] px-2 py-0.5 bg-card border border-border rounded font-mono text-muted-foreground">{item.file}</span>
                                {item.country && <span className="text-[10px] px-2 py-0.5 bg-card border border-border rounded font-mono text-muted-foreground">{item.country}</span>}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="flex-1 h-7 bg-primary text-primary-foreground rounded text-[10px] font-bold">CLAIM</button>
                                <button className="flex-1 h-7 bg-card border border-border rounded text-[10px] font-bold hover:bg-muted">DISMISS</button>
                            </div>
                        </div>
                    ))}

                    {/* Vraies alertes connectées (Fusion) */}
                    {alerts?.slice(0, 5).map((alert) => (
                        <Link to={`/alerts/${alert.uuid}`} key={alert.id}>
                            <div className="p-4 border-l-2 border-blue-500 relative group cursor-pointer hover:bg-muted/10 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">{alert.status} • {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="text-[10px] text-muted-foreground">REAL #{alert.id}</span>
                                </div>
                                <p className="text-xs font-bold mb-2 leading-tight truncate">{alert.url}</p>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[10px] px-2 py-0.5 bg-card border border-border rounded font-mono text-muted-foreground">RISK: {alert.risk_score}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="p-4 border-t border-border bg-background">
                <button className="w-full h-8 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-card border border-border rounded hover:text-foreground transition-colors">
                    Pause Stream
                </button>
            </div>
        </aside>
    );
}
