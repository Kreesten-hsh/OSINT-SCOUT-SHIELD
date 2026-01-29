import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    ShieldAlert,
    ArrowLeft,
    Clock,
    Globe,
    FileText,
    Share2,
    MoreHorizontal,
    CheckCircle,
    XCircle,
    AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";

import { apiClient } from "@/lib/api-client";
import type { Alert } from "@/types/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function InvestigationPage() {
    const { uuid } = useParams<{ uuid: string }>();

    const { data: alert, isLoading } = useQuery({
        queryKey: ["alert", uuid],
        queryFn: async () => (await apiClient.get<Alert>(`/alerts/${uuid}`)).data,
    });

    if (isLoading) return <div className="p-10 text-center">Loading Investigation Context...</div>;
    if (!alert) return <div className="p-10 text-center text-red-500">Case not found.</div>;

    return (
        <div className="h-full flex flex-col gap-6">
            {/* Header / Context Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link to="/alerts"><ArrowLeft className="w-5 h-5" /></Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight">Investigation #{alert.id.toString().slice(0, 6)}</h1>
                            <Badge variant="outline" className="font-mono text-[10px]">{alert.uuid}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Detected {new Date(alert.created_at).toLocaleString()}</span>
                            <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Source: {alert.source_type}</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Share2 className="w-4 h-4 mr-2" /> Share Case
                    </Button>
                    <Button variant="default" size="sm" className="bg-red-600 hover:bg-red-700">
                        <ShieldAlert className="w-4 h-4 mr-2" /> Block Asset
                    </Button>
                </div>
            </div>

            {/* Main Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Left Column: Context & Metadata */}
                <div className="space-y-6 lg:col-span-1 overflow-y-auto pr-2">
                    {/* Key Info Card */}
                    <Card className="p-6 space-y-4">
                        <h3 className="font-semibold text-lg">Threat Intelligence</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-muted/50 border border-border">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Risk Score</p>
                                <div className="text-3xl font-bold mt-1 text-primary">{alert.risk_score}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 border border-border">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Confidence</p>
                                <div className="text-3xl font-bold mt-1">High</div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between text-sm py-2 border-b border-border/50">
                                <span className="text-muted-foreground">Target URL</span>
                                <span className="font-mono text-xs">{alert.url}</span>
                            </div>
                            <div className="flex justify-between text-sm py-2 border-b border-border/50">
                                <span className="text-muted-foreground">Status</span>
                                <Badge>{alert.status}</Badge>
                            </div>
                            <div className="flex justify-between text-sm py-2 border-b border-border/50">
                                <span className="text-muted-foreground">Assigned To</span>
                                <span>Unassigned</span>
                            </div>
                        </div>
                    </Card>

                    {/* Timeline */}
                    <Card className="p-6">
                        <h3 className="font-semibold mb-4">Event Timeline</h3>
                        <div className="border-l-2 border-muted pl-4 space-y-6">
                            <div className="relative">
                                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-background"></div>
                                <p className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleTimeString()}</p>
                                <p className="text-sm font-medium">Alert Triggered</p>
                                <p className="text-xs text-muted-foreground">Detection engine flagged URL.</p>
                            </div>
                            <div className="relative">
                                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-muted border border-border ring-4 ring-background"></div>
                                <p className="text-xs text-muted-foreground">Now</p>
                                <p className="text-sm font-medium">Under Investigation</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Evidence & Analysis */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Evidence Viewer */}
                    <Card className="flex-1 min-h-[500px] flex flex-col p-0 overflow-hidden border-primary/20 bg-muted/10">
                        <div className="bg-card border-b border-border p-3 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="font-semibold text-sm">Evidence Browser</span>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-7 text-xs">Raw HTML</Button>
                                <Button variant="secondary" size="sm" className="h-7 text-xs">Screenshot</Button>
                                <Button variant="ghost" size="sm" className="h-7 text-xs">Headers</Button>
                            </div>
                        </div>
                        <div className="flex-1 p-8 flex items-center justify-center bg-black/50">
                            {/* Placeholder for real screenshot/evidence */}
                            <div className="text-center space-y-3">
                                <Globe className="w-16 h-16 text-muted-foreground mx-auto opacity-20" />
                                <p className="text-muted-foreground text-sm">Evidence Preview not available in Mock Mode.</p>
                                <Button variant="outline">Request Live Scan</Button>
                            </div>
                        </div>
                    </Card>

                    {/* AI Analysis (Mock) */}
                    <Card className="p-6 bg-gradient-to-br from-card to-primary/5 border-primary/10">
                        <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <BrainCircuit className="w-4 h-4 text-primary" />
                            AI Threat Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Based on pattern matching, this URL exhibits <strong>98% similarity</strong> to known Phishing kits targeting credentials.
                            The domain was registered <strong>2 hours ago</strong> and uses a suspicious TLD.
                            <br /><br />
                            <strong>Recommendation:</strong> Immediate blocking and takedown request suggested.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// Icon helper
function BrainCircuit(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
            <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
            <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
            <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
            <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
            <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
            <path d="M6 18a4 4 0 0 1-1.97-1.364" />
            <path d="M19.97 16.636A4 4 0 0 1 18 18" />
        </svg>
    )
}
