import VerifySignalPanel from '@/features/verify/VerifySignalPanel';
import { BrandLockup } from '@/components/brand/BrandLockup';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function VerifyPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex items-center justify-between gap-4">
                    <BrandLockup compact subtitle="Portail citoyen" />
                    <ThemeToggle />
                </header>
                <VerifySignalPanel />
            </div>
        </div>
    );
}
