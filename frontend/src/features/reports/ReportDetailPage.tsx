import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Shield, FileText, Download, Lock, CheckCircle, Loader2, Fingerprint, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

export default function ReportDetailPage() {
    const { id } = useParams<{ id: string }>(); // This is the ALERT UUID
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // 1. Fetch Alert Info (Live Data)
    const { data: alert, isLoading: isLoadingAlert } = useQuery({
        queryKey: ['alert-detail', id], // Renamed to clarify it's an alert
        queryFn: async () => {
            const response = await apiClient.get<any>(`/alerts/${id}`);
            return response.data;
        },
        enabled: !!id
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [lastGeneratedReport, setLastGeneratedReport] = useState<any>(null); // To satisfy UI feedback immediately

    const generateMutation = useMutation({
        mutationFn: async () => {
            const response = await apiClient.post(`/reports/generate/${id}`);
            return response.data;
        },
        onMutate: () => setIsGenerating(true),
        onSuccess: (data) => {
            toast({
                title: "Rapport Forensique Généré",
                description: "Le dossier a été figé et scellé avec succès.",
            });
            setLastGeneratedReport(data);
            setIsGenerating(false);
            queryClient.invalidateQueries({ queryKey: ['reports-list'] });
        },
        onError: () => {
            toast({
                title: "Erreur de génération",
                description: "Impossible de créer le rapport.",
                variant: "destructive"
            });
            setIsGenerating(false);
        }
    });

    if (isLoadingAlert) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
    if (!alert) return <div className="text-center p-10 text-destructive">Dossier introuvable.</div>;

    // View: If a report was just generated OR if we confirm one exists (omitted for speed unless we add filtered endpoint)
    // For Lot 6 User Flow: The user clicks "Generate", it creates it, and gives download link.

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">

            {/* HEADER METADATA (LIVE) */}
            <div className="bg-white border rounded-xl p-6 shadow-sm flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary" />
                        Dossier d'Investigation
                    </h1>
                    <div className="flex gap-4 text-sm text-slate-500">
                        <span className="font-mono">REF: {alert.uuid.slice(0, 8)}</span>
                        <span>•</span>
                        <span>Créé le {format(new Date(alert.created_at), "d MMM yyyy", { locale: fr })}</span>
                        <span>•</span>
                        <Badge variant={alert.risk_score > 70 ? "destructive" : "outline"}>
                            Risque {alert.risk_score}/100
                        </Badge>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-sm font-semibold mb-1">Cible</p>
                    <p className="font-mono text-sm bg-slate-100 px-2 py-1 rounded truncate max-w-[300px]">{alert.url}</p>
                </div>
            </div>

            {/* GENERATION / DOWNLOAD PANEL */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center space-y-6">

                {!lastGeneratedReport ? (
                    <>
                        <div className="mx-auto w-16 h-16 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                            <Lock className="w-8 h-8 text-slate-400" />
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Génération de Rapport Forensique</h2>
                            <p className="text-slate-500 max-w-md mx-auto mt-2 text-sm">
                                Cette action va créer une <b>copie figée et immuable</b> de toutes les données du dossier (Preuves, Analyse, Scores).
                                Un fichier PDF déterministe certifié par SHA-256 sera généré.
                            </p>
                        </div>

                        <Button
                            size="lg"
                            onClick={() => generateMutation.mutate()}
                            disabled={isGenerating}
                            className="bg-slate-900 text-white hover:bg-slate-800"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Cristallisation des données...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Générer et Figer le Rapport
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-slate-400">Action irréversible. Hash cryptographique calculé à la volée.</p>
                    </>
                ) : (
                    <div className="animate-in zoom-in duration-300">
                        <div className="mx-auto w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>

                        <h2 className="text-xl font-bold text-slate-900">Rapport Disponible</h2>
                        <div className="bg-white p-4 rounded border border-slate-200 inline-block text-left mt-4 mb-6 max-w-lg">
                            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                                <span className="text-slate-500 font-medium">ID Rapport:</span>
                                <span className="font-mono">{lastGeneratedReport.uuid}</span>

                                <span className="text-slate-500 font-medium flex items-center gap-1">
                                    <Fingerprint className="w-3 h-3" /> Hash (SHA256):
                                </span>
                                <span className="font-mono text-xs break-all bg-slate-50 p-1 rounded border border-slate-100">
                                    {lastGeneratedReport.report_hash}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4">
                            <Button
                                variant="outline"
                                onClick={() => window.open(`${import.meta.env.VITE_API_URL}/reports/${lastGeneratedReport.uuid}/download/pdf`, '_blank')}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Télécharger PDF
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => window.open(`${import.meta.env.VITE_API_URL}/reports/${lastGeneratedReport.uuid}/download/json`, '_blank')}
                            >
                                <div className="font-mono text-xs">JSON (Brut)</div>
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* PREVIEW OF LIVE DATA (Read Only context) */}
            <div className="opacity-60 pointer-events-none filter grayscale-[50%] select-none">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <h3 className="text-sm font-semibold uppercase text-slate-500">Aperçu des données vivantes (Non contractuel)</h3>
                </div>
                {/* Reusing parts of the old view just for context background */}
                <div className="bg-white p-8 border rounded-xl min-h-[400px]">
                    <div className="h-4 bg-slate-100 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/4 mb-10"></div>
                    <div className="grid grid-cols-2 gap-8">
                        <div className="h-32 bg-slate-100 rounded"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-slate-100 rounded w-full"></div>
                            <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                            <div className="h-4 bg-slate-100 rounded w-4/6"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

