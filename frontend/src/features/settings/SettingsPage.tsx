import { Shield, Settings2 } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                    <Settings2 className="h-6 w-6 text-primary" />
                    Parametres
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Espace de configuration de la plateforme.
                </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                    <Shield className="h-5 w-5 text-primary" />
                    Securite
                </h2>
                <p className="text-sm text-muted-foreground">
                    Les options de securite applicative sont gerees via les variables d&apos;environnement
                    backend (`SECRET_KEY`, `AUTH_ADMIN_EMAIL`, `AUTH_ADMIN_PASSWORD`, `BACKEND_CORS_ORIGINS`).
                </p>
            </div>
        </div>
    );
}
