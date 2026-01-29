import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export default function DashboardLayout() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <Sidebar />
            <Topbar />
            <main className="ml-64 p-6 min-h-[calc(100vh-64px)] animate-in fade-in duration-500">
                <Outlet />
            </main>
        </div>
    );
}
