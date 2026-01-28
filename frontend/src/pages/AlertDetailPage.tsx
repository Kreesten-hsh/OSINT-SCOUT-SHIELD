import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../lib/api-client";
import type { Alert, AlertUpdatePayload } from "../types/alert";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, ShieldCheck, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "../lib/utils";

const fetchAlertDetail = async (uuid: string) => {
    const response = await apiClient.get<Alert>(`/alerts/${uuid}`);
    return response.data;
};

const updateAlert = async ({ uuid, payload }: { uuid: string; payload: AlertUpdatePayload }) => {
    const response = await apiClient.patch<Alert>(`/alerts/${uuid}`, payload);
    return response.data;
};

// URL de base pour les preuves (Servis par l'API)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const getEvidenceUrl = (filename: string) => `${API_URL}/api/v1/evidence/${filename}`;

export default function AlertDetailPage() {
    const { uuid } = useParams<{ uuid: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: alert, isLoading, isError } = useQuery({
        queryKey: ["alert", uuid],
        queryFn: () => fetchAlertDetail(uuid!),
        enabled: !!uuid,
    });

    const mutation = useMutation({
        mutationFn: updateAlert,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["alert", uuid] });
            queryClient.invalidateQueries({ queryKey: ["alerts"] });
        },
    });

    if (isLoading) return <div>Chargement du dossier...</div>;
    if (isError || !alert) return <div>Dossier introuvable.</div>;

    const handleAction = (status: string, confirm: boolean) => {
        if (uuid) {
            mutation.mutate({ uuid, payload: { status, is_confirmed: confirm } });
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header Navigation */}
            <button onClick={() => navigate("/alerts")} className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm">
                <ArrowLeft className="w-4 h-4" /> Retour aux menaces
            </button>

            {/* Titre et Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        Dossier #{alert.id}
                        <span className={cn("text-xs px-2 py-1 rounded-full border",
                            alert.status === "NEW" ? "bg-blue-100 text-blue-800" : "bg-gray-100"
                        )}>
                            {alert.status}
                        </span>
                    </h1>
                    <p className="text-muted-foreground text-sm font-mono mt-1">{alert.uuid}</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => handleAction("CLOSED", true)}
                        disabled={mutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        <CheckCircle className="w-4 h-4" /> Valider & Fermer
                    </button>
                    <button
                        onClick={() => handleAction("FALSE_POSITIVE", false)}
                        disabled={mutation.isPending}
                        className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        <XCircle className="w-4 h-4" /> Faux Positif
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Colonne Gauche : Preuves & Analyse */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Carte Preuve */}
                    <div className="border rounded-lg shadow-sm bg-card p-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-indigo-500" /> Preuve Numérique (Forensique)
                        </h3>
                        {alert.evidence ? (
                            <div className="space-y-3">
                                <div className="aspect-video bg-gray-100 rounded-md overflow-hidden border">
                                    <img
                                        src={getEvidenceUrl(alert.evidence.file_path)}
                                        alt="Preuve Capture"
                                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                        onClick={() => window.open(getEvidenceUrl(alert.evidence.file_path), "_blank")}
                                    />
                                </div>
                                <div className="text-xs font-mono bg-muted p-2 rounded break-all text-muted-foreground border">
                                    <span className="font-bold text-foreground">SHA-256:</span> {alert.evidence.file_hash}
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground italic p-4 bg-muted/20 rounded">Aucune capture d'écran disponible.</p>
                        )}
                    </div>

                    {/* Carte Analyse Textuelle */}
                    <div className="border rounded-lg shadow-sm bg-card p-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-orange-500" /> Analyse Sémantique (NLP)
                        </h3>
                        {alert.evidence?.content_text_preview ? (
                            <blockquote className="text-sm border-l-4 border-primary pl-4 py-2 italic bg-muted/30 rounded-r">
                                "{alert.evidence.content_text_preview.slice(0, 300)}..."
                            </blockquote>
                        ) : <span className="text-sm text-muted-foreground">Texte non extrait.</span>}
                    </div>

                </div>

                {/* Colonne Droite : Méta-données & Intelligence */}
                <div className="space-y-6">

                    {/* Score Carte */}
                    <div className="border rounded-lg shadow-sm bg-card p-6 text-center">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Score de Risque</h3>
                        <div className={cn("text-4xl font-bold mb-1",
                            alert.risk_score > 50 ? "text-red-600" : "text-green-600"
                        )}>
                            {alert.risk_score}<span className="text-lg text-muted-foreground">/100</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Calculé par heuristique + NLP local
                        </div>
                    </div>

                    {/* Détails */}
                    <div className="border rounded-lg shadow-sm bg-card p-4">
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Intelligence</h3>

                        <div className="space-y-4 text-sm">
                            <div>
                                <p className="text-muted-foreground text-xs">Cible / URL</p>
                                <p className="font-medium truncate underline text-blue-600">
                                    <a href={alert.url} target="_blank" rel="noreferrer">{alert.url}</a>
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Catégories Détectées</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {alert.analysis_results?.categories?.map((cat, idx) => (
                                        <span key={idx} className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-semibold border border-red-100">
                                            {cat.name} ({cat.score}%)
                                        </span>
                                    )) || <span className="text-muted-foreground italic">Aucune catégorie spécifique.</span>}
                                </div>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Entités Nommées (NER)</p>
                                <ul className="mt-1 space-y-1">
                                    {alert.analysis_results?.entities?.map(([label, text], idx) => (
                                        <li key={idx} className="flex justify-between border-b pb-1 last:border-0 border-dashed">
                                            <span>{text}</span>
                                            <span className="text-xs bg-gray-100 px-1 rounded text-gray-500">{label}</span>
                                        </li>
                                    ))}
                                    {(!alert.analysis_results?.entities || alert.analysis_results.entities.length === 0) && (
                                        <li className="text-muted-foreground italic">Aucune entité extraite.</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
