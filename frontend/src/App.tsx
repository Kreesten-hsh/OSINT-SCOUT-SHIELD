import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import LoginPage from '@/features/auth/LoginPage';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardPage from '@/features/dashboard/DashboardPage';
import AlertsPage from '@/features/alerts/AlertsPage';
import InvestigationPage from '@/features/investigation/InvestigationPage';
import IngestionPage from '@/features/ingestion/IngestionPage';
import AnalysisPage from '@/features/analysis/AnalysisPage';
import ReportsListPage from '@/features/reports/ReportsListPage';
import ReportDetailPage from '@/features/reports/ReportDetailPage';
import EvidencePage from '@/features/evidence/EvidencePage';
import MonitoringPage from '@/features/monitoring/MonitoringPage';
import SourceDetailPage from '@/features/monitoring/SourceDetailPage';
import { useAuthStore } from '@/store/auth-store';

import { Toaster } from '@/components/ui/toaster';

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
          <Routes>
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
              <Route path="/evidence" element={<EvidencePage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
