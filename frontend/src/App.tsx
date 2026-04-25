import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { InstallPWA } from '@/components/InstallPWA';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/store/auth-store';

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const VerifyPage = lazy(() => import('@/features/verify/VerifyPage'));
const LivePage = lazy(() => import('@/features/live/LivePage'));
const DashboardLayout = lazy(() => import('@/layouts/DashboardLayout'));
const BusinessLayout = lazy(() => import('@/layouts/BusinessLayout'));
const BusinessVerifyPage = lazy(() => import('@/features/business/BusinessVerifyPage'));
const BusinessAlertsPage = lazy(() => import('@/features/business/BusinessAlertsPage'));
const BusinessReportsPage = lazy(() => import('@/features/business/BusinessReportsPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
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
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const ComingSoonPage = lazy(() => import('@/features/shared/ComingSoonPage'));

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
            <h1 className="text-2xl font-bold text-red-400">Erreur Critique</h1>
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
              <Route
                path="/pme/register"
                element={
                  <ComingSoonPage
                    title="Inscription PME"
                    description="Le parcours d'inscription PME avec validation obligatoire par l'administrateur est le prochain chantier du refactor."
                  />
                }
              />

              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<DashboardPage />} />
                <Route
                  path="/admin/pme"
                  element={
                    <ComingSoonPage
                      title="Gestion des PME"
                      description="La validation, le rejet et la désactivation des comptes PME seront branchés sur le nouveau domaine métier."
                    />
                  }
                />
                <Route path="/admin/signalements" element={<CitizenIncidentsPage />} />
                <Route path="/admin/signalements/:id" element={<CitizenIncidentDetailPage />} />
                <Route path="/admin/dossiers" element={<ReportsListPage />} />
                <Route path="/admin/dossiers/:id" element={<ReportDetailPage />} />
                <Route
                  path="/admin/transmissions"
                  element={
                    <ComingSoonPage
                      title="Transmissions externes"
                      description="Le tableau de supervision des transmissions ANSSI/OCRC et opérateurs sera branché après la nouvelle file Redis."
                    />
                  }
                />
                <Route
                  path="/admin/exports"
                  element={
                    <ComingSoonPage
                      title="Exports"
                      description="Les exports CSV et STIX-lite seront branchés sur le nouveau domaine admin."
                    />
                  }
                />

                <Route path="/dashboard" element={<DashboardPage />} />
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
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              <Route element={<RequireSME />}>
                <Route path="/pme" element={<Navigate to="/pme/dashboard" replace />} />
                <Route path="/pme/dashboard" element={<BusinessVerifyPage />} />
                <Route path="/pme/alertes" element={<BusinessAlertsPage />} />
                <Route
                  path="/pme/signalements"
                  element={
                    <ComingSoonPage
                      title="Signalements liés"
                      description="La liste PME des signalements liés à l'usurpation sera branchée sur le nouveau domaine métier."
                    />
                  }
                />
                <Route path="/pme/dossiers" element={<BusinessReportsPage />} />
                <Route
                  path="/pme/profil"
                  element={
                    <ComingSoonPage
                      title="Profil PME"
                      description="La fiche PME modifiable et les numéros légitimes déclarés seront branchés avec le nouveau modèle business_profile."
                    />
                  }
                />

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
