import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

import { Toaster } from '@/components/ui/toaster';

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const VerifyPage = lazy(() => import('@/features/verify/VerifyPage'));
const DashboardLayout = lazy(() => import('@/layouts/DashboardLayout'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
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

// --- Error Boundary ---

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
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
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-2xl font-bold text-red-400">Erreur Critique</h1>
            <p className="text-slate-400">
              Une erreur inattendue s'est produite. Rechargez la page.
            </p>
            <pre className="text-xs text-slate-500 bg-slate-900 p-3 rounded-lg overflow-auto max-h-32">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm transition-colors"
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

// --- Auth Guard ---

const RequireAuth = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" replace />;
};

// --- App ---

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireAuth />}>
                <Route path="/dashboard" element={<DashboardPage />} />
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
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
