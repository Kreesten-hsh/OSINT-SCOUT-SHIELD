import { Link } from 'react-router-dom';
import { Cog, KeyRound, Shield, Workflow } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="space-y-5">
            <section className="panel p-5">
                <h2 className="font-display text-2xl font-semibold tracking-tight">Parametres operationnels</h2>
                <p className="text-sm text-muted-foreground">
                    Cette section documente les points de configuration actifs pour la demo et l'exploitation locale.
                </p>
            </section>

            <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <article className="panel p-4">
                    <h3 className="mb-2 inline-flex items-center gap-2 font-semibold">
                        <KeyRound className="h-4 w-4 text-primary" /> Authentification
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Identifiants analyste geres par les variables backend `AUTH_ADMIN_EMAIL` et `AUTH_ADMIN_PASSWORD`.
                    </p>
                </article>

                <article className="panel p-4">
                    <h3 className="mb-2 inline-flex items-center gap-2 font-semibold">
                        <Workflow className="h-4 w-4 text-primary" /> SHIELD simule
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Secret de callback operateur configure via `SHIELD_OPERATOR_SHARED_SECRET`.
                    </p>
                </article>

                <article className="panel p-4">
                    <h3 className="mb-2 inline-flex items-center gap-2 font-semibold">
                        <Shield className="h-4 w-4 text-primary" /> Securite applicative
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Signature JWT et CORS controles avec `SECRET_KEY` et `BACKEND_CORS_ORIGINS`.
                    </p>
                </article>
            </section>

            <section className="panel p-4">
                <h3 className="mb-2 inline-flex items-center gap-2 font-semibold">
                    <Cog className="h-4 w-4 text-primary" /> Navigation utile
                </h3>
                <div className="flex flex-wrap gap-2">
                    <Link to="/monitoring" className="rounded-lg border border-input px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/40 hover:text-foreground">
                        Ouvrir Surveillance
                    </Link>
                    <Link to="/ingestion" className="rounded-lg border border-input px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/40 hover:text-foreground">
                        Ouvrir Ingestion
                    </Link>
                    <Link to="/reports" className="rounded-lg border border-input px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/40 hover:text-foreground">
                        Ouvrir Rapports
                    </Link>
                </div>
            </section>
        </div>
    );
}
