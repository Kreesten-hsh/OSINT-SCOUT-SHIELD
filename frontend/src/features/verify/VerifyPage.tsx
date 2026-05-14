import VerifySignalPanel from '@/features/verify/VerifySignalPanel';
import { BrandLockup } from '@/components/brand/BrandLockup';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Download, Home, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

const APK_DOWNLOAD_URL = '/downloads/benin-cyber-shield.apk';

export default function VerifyPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link to="/" aria-label="Retour a l'accueil">
                        <BrandLockup compact subtitle="Portail citoyen" />
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            to="/"
                            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-input bg-card/80 px-3 text-sm font-semibold text-foreground hover:bg-secondary/70"
                        >
                            <Home className="h-4 w-4" />
                            Accueil
                        </Link>
                        <a
                            href={APK_DOWNLOAD_URL}
                            download
                            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                        >
                            <Smartphone className="h-4 w-4" />
                            <span className="hidden sm:inline">App Android</span>
                            <Download className="h-4 w-4" />
                        </a>
                        <ThemeToggle />
                    </div>
                </header>
                <VerifySignalPanel />
            </div>
        </div>
    );
}
