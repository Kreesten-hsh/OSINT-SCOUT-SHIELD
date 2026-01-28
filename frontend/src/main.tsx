import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

// Layouts & Pages (Imports dynamiques ou directs)
// Pour l'instant on met des placeholders
import DashboardPage from "./pages/DashboardPage";
import AlertDetailPage from "./pages/AlertDetailPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 1, // 1 minute de cache par défaut
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background text-foreground antialiased font-sans">
          {/* TODO: Ajouter une Navbar ici */}
          <main className="container mx-auto py-8 px-4">
            <Routes>
              <Route path="/" element={<Navigate to="/alerts" replace />} />
              <Route path="/alerts" element={<DashboardPage />} />
              <Route path="/alerts/:uuid" element={<AlertDetailPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  </React.StrictMode>
);
