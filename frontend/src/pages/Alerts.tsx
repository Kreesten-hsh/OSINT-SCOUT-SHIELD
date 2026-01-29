import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    Search,
    Filter,
    MoreVertical,
    ShieldAlert,
    Eye,
    Trash2,
    Archive,
    ArrowUpDown
} from "lucide-react";

import { apiClient } from "@/lib/api-client";
import type { Alert } from "@/types/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function AlertsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    const { data: alerts, isLoading } = useQuery({
        queryKey: ["alerts"],
        queryFn: async () => (await apiClient.get<Alert[]>("/alerts/")).data,
    });

    // Client-side filtering (en attendant le backend pagination/filter)
    const filteredAlerts = alerts?.filter(alert => {
        const matchesSearch = alert.url.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter ? alert.status === statusFilter : true;
        return matchesSearch && matchesStatus;
    });

    const getRiskVariant = (score: number) => {
        if (score >= 80) return "destructive";
        if (score >= 50) return "secondary"; // Masquerade as orange/yellow usually
        return "default"; // Green/Blue
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "NEW": return "default";
            case "INVESTIGATING": return "secondary";
            case "CLOSED": return "outline";
            default: return "default";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Security Alerts Console</h1>
                    <p className="text-muted-foreground">Manage and triage incoming OSINT threats.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" /> Filters
                    </Button>
                    <Button variant="default" size="sm">
                        Export Report
                    </Button>
                </div>
            </div>

            {/* Toolbar */}
            <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search alerts by target or ID..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    {["NEW", "INVESTIGATING", "CLOSED"].map(status => (
                        <Badge
                            key={status}
                            variant={statusFilter === status ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                        >
                            {status}
                        </Badge>
                    ))}
                </div>
            </Card>

            {/* Alerts Table */}
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Target / Threat</TableHead>
                            <TableHead>Risk Score</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Detected</TableHead>
                            <TableHead>Analyst</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    Loading alerts...
                                </TableCell>
                            </TableRow>
                        ) : filteredAlerts?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No alerts found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAlerts?.map((alert) => (
                                <TableRow key={alert.id}>
                                    <TableCell className="font-mono text-xs">{alert.id.toString().substring(0, 8)}...</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{alert.url}</span>
                                            <span className="text-xs text-muted-foreground">{alert.source_type}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={getRiskVariant(alert.risk_score)}>
                                                {alert.risk_score} / 100
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(alert.status)} className="uppercase text-[10px]">
                                            {alert.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {new Date(alert.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                                                AI
                                            </div>
                                            <span className="text-xs">OSINT-Bot</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link to={`/alerts/${alert.uuid}`}>
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                            </Button>
                                            <Button variant="ghost" size="icon">
                                                <Archive className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
