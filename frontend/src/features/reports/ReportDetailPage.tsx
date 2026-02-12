import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    AlertTriangle,
    CheckCircle,
    Download,
    FileText,
    Fingerprint,
    Loader2,
    Lock,
    Shield,
} from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import type { Alert } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface GeneratedReport {
    id: number;
    uuid: string;
    report_hash: string;
    snapshot_hash_sha256: string;
    snapshot_version: string;
    generated_at: string;
    pdf_path: string;
}

export default function ReportDetailPage() {
    const { id } = useParams<{ id: string }>(); // alert UUID
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [lastGeneratedReport, setLastGeneratedReport] = useState<GeneratedReport | null>(null);

    const { data: alert, isLoading: isLoadingAlert } = useQuery({
        queryKey: ['alert-detail', id],
        queryFn: async () => {
            const response = await apiClient.get<Alert>(`/alerts/${id}`);
            return response.data;
        },
        enabled: !!id,
    });

    const generateMutation = useMutation({
        mutationFn: async () => {
            if (!id) {
                throw new Error('Alerte introuvable');
            }
            const response = await apiClient.post<APIResponse<GeneratedReport>>(`/reports/generate/${id}`);
            return response.data;
        },
        onSuccess: (response) => {
            if (!response.success || !response.data) {
                toast({
                    title: 'Erreur de generation',
                    description: response.message || 'Impossible de creer le rapport.',
                    variant: 'destructive',
                });
                return;
            }

            setLastGeneratedReport(response.data);
            queryClient.invalidateQueries({ queryKey: ['reports-list'] });
            toast({
                title: 'Rapport forensique genere',
                description: response.message,
            });
        },
        onError: () => {
            toast({
                title: 'Erreur de generation',
                description: 'Impossible de creer le rapport.',
                variant: 'destructive',
            });
        },
    });

    if (isLoadingAlert) {
        return (
            <div className="flex justify-center p-10">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    if (!alert) {
        return <div className="p-10 text-center text-destructive">Dossier introuvable.</div>;
    }

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

    return (
        <div className="mx-auto max-w-4xl animate-in space-y-8 pb-20 fade-in duration-500">
            <div className="flex items-start justify-between rounded-xl border bg-white p-6 shadow-sm">
                <div>
                    <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold">
                        <Shield className="h-6 w-6 text-primary" />
                        Dossier d&apos;investigation
                    </h1>
                    <div className="flex gap-4 text-sm text-slate-500">
                        <span className="font-mono">REF: {alert.uuid.slice(0, 8)}</span>
                        <span>•</span>
                        <span>Cree le {format(new Date(alert.created_at), 'd MMM yyyy', { locale: fr })}</span>
                        <span>•</span>
                        <Badge variant={alert.risk_score > 70 ? 'destructive' : 'outline'}>
                            Risque {alert.risk_score}/100
                        </Badge>
                    </div>
                </div>

                <div className="text-right">
                    <p className="mb-1 text-sm font-semibold">Cible</p>
                    <p className="max-w-[300px] truncate rounded bg-slate-100 px-2 py-1 font-mono text-sm">{alert.url}</p>
                </div>
            </div>

            <div className="space-y-6 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                {!lastGeneratedReport ? (
                    <>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                            <Lock className="h-8 w-8 text-slate-400" />
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Generation de rapport forensique</h2>
                            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                                Cette action va creer une copie figee et immuable des donnees du dossier.
                                Un PDF certifie par hash SHA-256 sera genere.
                            </p>
                        </div>

                        <Button
                            size="lg"
                            onClick={() => generateMutation.mutate()}
                            disabled={generateMutation.isPending}
                            className="bg-slate-900 text-white hover:bg-slate-800"
                        >
                            {generateMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Cristallisation des donnees...
                                </>
                            ) : (
                                <>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Generer et figer le rapport
                                </>
                            )}
                        </Button>
                    </>
                ) : (
                    <div className="animate-in zoom-in duration-300">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-green-200 bg-green-50">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>

                        <h2 className="text-xl font-bold text-slate-900">Rapport disponible</h2>
                        <div className="mt-4 mb-6 inline-block max-w-lg rounded border border-slate-200 bg-white p-4 text-left">
                            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                                <span className="font-medium text-slate-500">ID Rapport:</span>
                                <span className="font-mono">{lastGeneratedReport.uuid}</span>

                                <span className="flex items-center gap-1 font-medium text-slate-500">
                                    <Fingerprint className="h-3 w-3" />
                                    Hash (SHA256):
                                </span>
                                <span className="break-all rounded border border-slate-100 bg-slate-50 p-1 font-mono text-xs">
                                    {lastGeneratedReport.report_hash}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4">
                            <Button
                                variant="outline"
                                onClick={() => window.open(`${apiBase}/reports/${lastGeneratedReport.uuid}/download/pdf`, '_blank')}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Telecharger PDF
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => window.open(`${apiBase}/reports/${lastGeneratedReport.uuid}/download/json`, '_blank')}
                            >
                                <span className="font-mono text-xs">JSON</span>
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="pointer-events-none select-none opacity-60 grayscale-[50%]">
                <div className="mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <h3 className="text-sm font-semibold uppercase text-slate-500">
                        Apercu des donnees vivantes (non contractuel)
                    </h3>
                </div>
                <div className="min-h-[400px] rounded-xl border bg-white p-8">
                    <div className="mb-4 h-4 w-1/3 rounded bg-slate-100" />
                    <div className="mb-10 h-4 w-1/4 rounded bg-slate-100" />
                    <div className="grid grid-cols-2 gap-8">
                        <div className="h-32 rounded bg-slate-100" />
                        <div className="space-y-2">
                            <div className="h-4 w-full rounded bg-slate-100" />
                            <div className="h-4 w-5/6 rounded bg-slate-100" />
                            <div className="h-4 w-4/6 rounded bg-slate-100" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
