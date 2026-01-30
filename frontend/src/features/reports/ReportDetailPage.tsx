import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Shield, MapPin, Hash, AlertTriangle, Fingerprint, Printer, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReportDetailPage() {
    const { id } = useParams<{ id: string }>();

    const { data: alert, isLoading } = useQuery({
        queryKey: ['report-detail', id],
        queryFn: async () => {
            const response = await apiClient.get<any>(`/reports/${id}`);
            return response.data;
        }
    });

    if (isLoading) return <div className="text-center p-10">Génération du rapport...</div>;
    if (!alert) return <div className="text-center p-10 text-destructive">Rapport introuvable.</div>;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* PRINT ACTION BAR */}
            <div className="flex justify-end print:hidden">
                <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Imprimer / PDF
                </Button>
            </div>

            {/* REPORT DOCUMENT - A4 like formatting */}
            <div className="bg-white text-slate-900 mx-auto min-h-[29.7cm] p-[2cm] shadow-2xl print:shadow-none print:p-0 font-serif">

                {/* HEAD */}
                <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                            <Shield className="w-8 h-8" />
                            OSINT-SCOUT
                        </h1>
                        <p className="text-xs uppercase font-bold tracking-widest mt-1 text-slate-500">
                            Division Renseignement & Cyber-Investigation
                        </p>
                    </div>
                    <div className="text-right text-sm font-mono">
                        <p>RÉF: {alert.uuid.slice(0, 8).toUpperCase()}</p>
                        <p>DATE: {format(new Date(), 'dd/MM/yyyy', { locale: fr })}</p>
                        <p className="font-bold text-red-700 uppercase">CONFIDENTIEL / TLP:AMBER</p>
                    </div>
                </div>

                {/* TITLE */}
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold uppercase underline decoration-2 underline-offset-4">
                        Rapport d'Investigation Numérique
                    </h2>
                    <p className="mt-2 text-sm italic text-slate-600">
                        Article 434-15-2 du Code Pénal (ref. interne)
                    </p>
                </div>

                {/* 1. SYNTHÈSE */}
                <section className="mb-8">
                    <h3 className="text-lg font-bold uppercase border-b border-slate-300 mb-4 flex items-center gap-2">
                        1. Synthèse Administrative
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p><span className="font-bold">Cible (URL) :</span> {alert.url}</p>
                            <p><span className="font-bold">Type de Source :</span> {alert.source_type}</p>
                        </div>
                        <div>
                            <p><span className="font-bold">Date de Saisie :</span> {format(new Date(alert.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}</p>
                            <p><span className="font-bold">Statut Dossier :</span> <span className="uppercase">{alert.status}</span></p>
                        </div>
                    </div>
                </section>

                {/* 2. ANALYSE TECHNIQUE */}
                <section className="mb-8">
                    <h3 className="text-lg font-bold uppercase border-b border-slate-300 mb-4 flex items-center gap-2">
                        2. Analyse Technique & Risques
                    </h3>

                    <div className="bg-slate-50 p-4 border border-slate-200 rounded mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold">Niveau de Menace Calculé :</span>
                            <span className="font-mono font-bold text-xl">{alert.risk_score}/100</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden print:border print:border-slate-400">
                            <div
                                className="h-full bg-slate-800"
                                style={{ width: `${alert.risk_score}%` }}
                            />
                        </div>
                    </div>

                    <div className="text-sm space-y-2 text-justify">
                        <p>
                            L'analyse automatisée réalisée par le moteur OSINT-SCOUT a mis en évidence des indicateurs techniques
                            justifiant le score de risque ci-dessus. Le traitement heuristique du contenu a permis d'isoler
                            les éléments probants suivants.
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            {alert.analysis_results && alert.analysis_results.summary ? (
                                <li>{alert.analysis_results.summary}</li>
                            ) : (
                                <li>Aucun résumé automatique disponible. L'analyse manuelle prévaut.</li>
                            )}
                            {/* Entity extraction results could go here if available in list format */}
                        </ul>
                    </div>
                </section>

                {/* 3. PREUVES NUMÉRIQUES */}
                <section className="mb-8 break-inside-avoid">
                    <h3 className="text-lg font-bold uppercase border-b border-slate-300 mb-4 flex items-center gap-2">
                        3. Preuves Numériques (Hash & Captures)
                    </h3>

                    {alert.evidence ? (
                        <div className="space-y-4">
                            <div className="flex bg-slate-100 p-2 font-mono text-xs border border-slate-300">
                                <span className="font-bold mr-2">SHA-256 (Metadonnées) :</span>
                                <span className="break-all">{alert.evidence.file_hash || "N/A"}</span>
                            </div>

                            {alert.evidence.screenshot_path ? (
                                <div className="border border-slate-300 p-1">
                                    <img
                                        src={`${import.meta.env.VITE_API_URL}/evidence/file/${alert.evidence.screenshot_path.split('/').pop()}`}
                                        alt="Preuve Capture"
                                        className="w-full h-auto grayscale-[20%] contrast-125"
                                    />
                                    <p className="text-xs text-center mt-1 text-slate-500 italic">Figure 1 : Capture horodatée du vecteur cible.</p>
                                </div>
                            ) : (
                                <p className="text-sm italic text-slate-500">Aucune capture visuelle jointe au dossier.</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm italic text-slate-500">Aucune preuve technique indexée.</p>
                    )}
                </section>

                {/* 4. CONCLUSION */}
                <section className="mt-10 break-inside-avoid">
                    <h3 className="text-lg font-bold uppercase border-b border-slate-300 mb-4">
                        4. Conclusion & Recommandations
                    </h3>
                    <div className="border border-slate-900 p-6 min-h-[150px]">
                        <p className="font-bold text-sm mb-2">Décision de l'Analyste :</p>
                        <p className="text-sm text-justify">
                            {alert.is_confirmed ?
                                "Dossier CONFIRMÉ POSITIF. Les éléments techniques corroborent la nature malveillante de l'URL soumise. Recommandation de blocage immédiat et transmission aux autorités compétentes." :
                                "Dossier EN ATTENTE / NON CONCLUANT. Les éléments actuels ne permettent pas de confirmer l'intention malveillante avec certitude. Surveillance active maintenue."
                            }
                        </p>

                        <div className="mt-10 flex justify-end">
                            <div className="text-center">
                                <p className="text-xs font-bold mb-8">Visa de la Direction</p>
                                <div className="w-32 border-b border-slate-900"></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FOOTER */}
                <div className="mt-20 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-400 font-mono">
                    <p>Ce document est généré automatiquement par OSINT-SCOUT v1.0.3.</p>
                    <p>Toute modification invalide la chaîne de garde numérique.</p>
                </div>

            </div>
        </div>
    );
}

// Simple button component inline mock if needed, but assuming shadcn button exists
