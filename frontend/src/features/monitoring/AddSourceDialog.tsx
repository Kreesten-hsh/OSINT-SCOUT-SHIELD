import { useState } from 'react';
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
        is_active: true
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
        } catch (err: any) { // eslint-disable-line
            setError(err.response?.data?.detail || "Erreur lors de la création de la source");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-lg p-6 animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold mb-4">Ajouter une Source</h2>

                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4 border border-destructive/20">
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
                            className="w-full bg-secondary/50 border border-input rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">URL Cible</label>
                        <input
                            required
                            type="url"
                            placeholder="https://facebook.com/groups/..."
                            className="w-full bg-secondary/50 border border-input rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                            value={formData.url}
                            onChange={e => setFormData({ ...formData, url: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <select
                                className="w-full bg-secondary/50 border border-input rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                value={formData.source_type}
                                onChange={e => setFormData({ ...formData, source_type: e.target.value })}
                            >
                                <option value="WEB">Site Web</option>
                                <option value="SOCIAL">Réseau Social</option>
                                <option value="MARKETPLACE">Marketplace</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Fréquence (min)</label>
                            <select
                                className="w-full bg-secondary/50 border border-input rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                value={formData.frequency_minutes}
                                onChange={e => setFormData({ ...formData, frequency_minutes: Number(e.target.value) })}
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
                            className="w-4 h-4 rounded border-input bg-secondary text-primary focus:ring-primary"
                            checked={formData.is_active}
                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                        />
                        <label htmlFor="active" className="text-sm text-muted-foreground select-none">
                            Activer la surveillance immédiatement
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-md transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Créer la source
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
