import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

// Layouts
import DashboardLayout from "@/components/layout/DashboardLayout";

// Pages
import DashboardPage from "@/pages/Dashboard";
import AlertsPage from "@/pages/Alerts";
import InvestigationPage from "@/pages/Investigation";
import AnalyticsPage from "@/pages/Analytics";
import RulesPage from "@/pages/Rules";

// Configuration du client react-query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60, // 1 minute
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected Dashboard Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/alerts/:uuid" element={<InvestigationPage />} />

            <Route path="/investigations" element={<Navigate to="/alerts" replace />} /> {/* Alias pour l'instant */}
            <Route path="/investigations/:uuid" element={<InvestigationPage />} />

            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/rules" element={<RulesPage />} />

            {/* Pages non implémentées */}
            <Route path="/reports" element={<div className="p-8">Reports coming soon</div>} />
            <Route path="/settings" element={<div className="p-8">Global Settings coming soon</div>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  </React.StrictMode>
);
