import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export default function DashboardLayout() {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <a
                href="#main-content"
                className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
            >
                Aller au contenu principal
            </a>
            <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
            <div className="md:ml-72">
                <Topbar onMenuToggle={() => setMobileSidebarOpen((prev) => !prev)} />
                <main id="main-content" className="fade-rise-in mx-auto max-w-[1600px] px-4 pb-8 pt-6 sm:px-6 lg:px-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
