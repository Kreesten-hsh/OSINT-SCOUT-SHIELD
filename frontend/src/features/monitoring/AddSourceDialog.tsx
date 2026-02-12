import { useState } from 'react';
import axios from 'axios';
import { Loader2, X } from 'lucide-react';
import { monitoringService, MonitoringSourceCreate } from '@/services/monitoringService';

interface AddSourceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddSourceDialog({ isOpen, onClose, onSuccess }: AddSourceDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<MonitoringSourceCreate>({
        name: '',
        url: '',
        source_type: 'WEB',
        frequency_minutes: 60,
        is_active: true,
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await monitoringService.create(formData);
            onSuccess();
            onClose();
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(
                    err.response?.data?.message ||
                        err.response?.data?.detail ||
                        'Erreur lors de la creation de la source'
                );
            } else {
                setError('Erreur lors de la creation de la source');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-lg animate-in zoom-in-95 rounded-xl border border-border bg-card p-6 shadow-lg fade-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
                >
                    <X className="h-5 w-5" />
                </button>

                <h2 className="mb-4 text-xl font-bold">Ajouter une source</h2>

                {error && (
                    <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nom de la source</label>
                        <input
                            required
                            type="text"
                            placeholder="Ex: Groupe Fb Vente Cotonou"
                            className="w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">URL cible</label>
                        <input
                            required
                            type="url"
                            placeholder="https://facebook.com/groups/..."
                            className="w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <select
                                className="w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                                value={formData.source_type}
                                onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                            >
                                <option value="WEB">Site web</option>
                                <option value="SOCIAL">Reseau social</option>
                                <option value="MARKETPLACE">Marketplace</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Frequence (min)</label>
                            <select
                                className="w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                                value={formData.frequency_minutes}
                                onChange={(e) => setFormData({ ...formData, frequency_minutes: Number(e.target.value) })}
                            >
                                <option value={15}>15 minutes</option>
                                <option value={30}>30 minutes</option>
                                <option value={60}>1 heure</option>
                                <option value={360}>6 heures</option>
                                <option value={1440}>24 heures</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="active"
                            className="h-4 w-4 rounded border-input bg-secondary text-primary focus:ring-primary"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        />
                        <label htmlFor="active" className="select-none text-sm text-muted-foreground">
                            Activer la surveillance immediatement
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Creer la source
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
