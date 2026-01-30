import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { useAuthStore } from '@/store/auth-store';

const queryClient = new QueryClient();

const RequireAuth = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<DashboardPage />} />
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
    </QueryClientProvider>
  )
}

export default App
