import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '@/features/auth/LoginPage';
import RequireAuth from '@/components/layout/RequireAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<div className="text-white p-10"><h1 className="text-3xl font-bold mb-4">Vue Globale</h1><p>Bienvenue sur le tableau de bord de surveillance.</p></div>} />
              <Route path="/alerts" element={<div className="text-white p-10">Alertes Placeholder</div>} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
