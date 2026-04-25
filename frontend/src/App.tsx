import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { InstallPWA } from '@/components/InstallPWA';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/store/auth-store';

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const PmeRegisterPage = lazy(() => import('@/features/auth/PmeRegisterPage'));
const VerifyPage = lazy(() => import('@/features/verify/VerifyPage'));
const LivePage = lazy(() => import('@/features/live/LivePage'));
const DashboardLayout = lazy(() => import('@/layouts/DashboardLayout'));
const BusinessLayout = lazy(() => import('@/layouts/BusinessLayout'));
const AdminDashboardPage = lazy(() => import('@/features/admin/AdminDashboardPage'));
const AdminBusinessesPage = lazy(() => import('@/features/admin/AdminBusinessesPage'));
const AdminBusinessDetailPage = lazy(() => import('@/features/admin/AdminBusinessDetailPage'));
const AdminTransmissionsPage = lazy(() => import('@/features/admin/AdminTransmissionsPage'));
const AdminExportsPage = lazy(() => import('@/features/admin/AdminExportsPage'));
const AdminSettingsPage = lazy(() => import('@/features/admin/AdminSettingsPage'));
const BusinessVerifyPage = lazy(() => import('@/features/business/BusinessVerifyPage'));
const BusinessAlertsPage = lazy(() => import('@/features/business/BusinessAlertsPage'));
const BusinessSignalsPage = lazy(() => import('@/features/business/BusinessSignalsPage'));
const BusinessReportsPage = lazy(() => import('@/features/business/BusinessReportsPage'));
const BusinessProfilePage = lazy(() => import('@/features/business/BusinessProfilePage'));
const ThreatMapPage = lazy(() => import('@/features/threat-map/ThreatMapPage'));
const AlertsPage = lazy(() => import('@/features/alerts/AlertsPage'));
const InvestigationPage = lazy(() => import('@/features/investigation/InvestigationPage'));
const CitizenIncidentsPage = lazy(() => import('@/features/citizen-incidents/CitizenIncidentsPage'));
const CitizenIncidentDetailPage = lazy(() => import('@/features/citizen-incidents/CitizenIncidentDetailPage'));
const IngestionPage = lazy(() => import('@/features/ingestion/IngestionPage'));
const AnalysisPage = lazy(() => import('@/features/analysis/AnalysisPage'));
const ReportsListPage = lazy(() => import('@/features/reports/ReportsListPage'));
const ReportDetailPage = lazy(() => import('@/features/reports/ReportDetailPage'));
const EvidencePage = lazy(() => import('@/features/evidence/EvidencePage'));
const MonitoringPage = lazy(() => import('@/features/monitoring/MonitoringPage'));
const SourceDetailPage = lazy(() => import('@/features/monitoring/SourceDetailPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-bold text-red-400">Erreur critique</h1>
            <p className="text-slate-400">Une erreur inattendue s'est produite. Rechargez la page.</p>
            <pre className="max-h-32 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-500">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm transition-colors hover:bg-indigo-500"
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Chargement de la page...
    </div>
  );
}

const RequireAdmin = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/pme/dashboard" replace />;
  }
  return <DashboardLayout />;
};

const RequireSME = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== 'SME') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <BusinessLayout />;
};

const RootRedirect = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/verify" replace />;
  }
  if (user?.role === 'SME') {
    return <Navigate to="/pme/dashboard" replace />;
  }
  return <Navigate to="/admin/dashboard" replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/live" element={<LivePage />} />
              <Route path="/pme/register" element={<PmeRegisterPage />} />

              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/pme" element={<AdminBusinessesPage />} />
                <Route path="/admin/pme/:businessUuid" element={<AdminBusinessDetailPage />} />
                <Route path="/admin/signalements" element={<CitizenIncidentsPage />} />
                <Route path="/admin/signalements/:id" element={<CitizenIncidentDetailPage />} />
                <Route path="/admin/dossiers" element={<ReportsListPage />} />
                <Route path="/admin/dossiers/:id" element={<ReportDetailPage />} />
                <Route path="/admin/transmissions" element={<AdminTransmissionsPage />} />
                <Route path="/admin/exports" element={<AdminExportsPage />} />
                <Route path="/admin/settings" element={<AdminSettingsPage />} />

                <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/threat-map" element={<ThreatMapPage />} />
                <Route path="/monitoring" element={<MonitoringPage />} />
                <Route path="/monitoring/:id" element={<SourceDetailPage />} />
                <Route path="/ingestion" element={<IngestionPage />} />
                <Route path="/analyse" element={<AnalysisPage />} />
                <Route path="/reports" element={<ReportsListPage />} />
                <Route path="/reports/:id" element={<ReportDetailPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/alerts/:id" element={<InvestigationPage />} />
                <Route path="/incidents-signales" element={<CitizenIncidentsPage />} />
                <Route path="/incidents-signales/:id" element={<CitizenIncidentDetailPage />} />
                <Route path="/evidence" element={<EvidencePage />} />
                <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
              </Route>

              <Route element={<RequireSME />}>
                <Route path="/pme" element={<Navigate to="/pme/dashboard" replace />} />
                <Route path="/pme/dashboard" element={<BusinessVerifyPage />} />
                <Route path="/pme/alertes" element={<BusinessAlertsPage />} />
                <Route path="/pme/signalements" element={<BusinessSignalsPage />} />
                <Route path="/pme/dossiers" element={<BusinessReportsPage />} />
                <Route path="/pme/profil" element={<BusinessProfilePage />} />

                <Route path="/business" element={<Navigate to="/pme/dashboard" replace />} />
                <Route path="/business/verify" element={<Navigate to="/pme/dashboard" replace />} />
                <Route path="/business/monitoring" element={<Navigate to="/pme/signalements" replace />} />
                <Route path="/business/alerts" element={<Navigate to="/pme/alertes" replace />} />
                <Route path="/business/reports" element={<Navigate to="/pme/dossiers" replace />} />
              </Route>
            </Routes>
          </Suspense>
          <InstallPWA />
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
