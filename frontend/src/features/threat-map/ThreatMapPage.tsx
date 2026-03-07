import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Download, FileJson } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth-store';

type TopNumber = {
  masked: string;
  count: number;
  score: number;
  region: string | null;
  category: string | null;
  alert: boolean;
};

type CategoryItem = {
  name: string;
  count: number;
};

type ThreatIntelDashboard = {
  top_numbers: TopNumber[];
  categories: CategoryItem[];
  active_threats: number;
};

function ChartSkeleton() {
  return (
    <div className="space-y-3 py-2 animate-pulse">
      <div className="h-4 w-1/3 rounded bg-secondary/40" />
      <div className="h-40 rounded-xl bg-secondary/30" />
      <div className="h-3 w-2/3 rounded bg-secondary/30" />
    </div>
  );
}

export default function ThreatMapPage() {
  const token = useAuthStore((state) => state.token);
  const [isStixDownloading, setIsStixDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['threat-intel', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<ThreatIntelDashboard>('/threat-intel/dashboard');
      return response.data;
    },
    refetchInterval: 60_000,
  });

  const handleCsvDownload = () => {
    window.location.href = '/api/v1/dashboard/intel/export?format=csv';
  };

  const handleStixDownload = async () => {
    setIsStixDownloading(true);
    try {
      const response = await fetch('/api/v1/dashboard/intel/export?format=stix', {
        headers: token ? { Authorization: `Bearer ${token.access_token}` } : {},
      });
      if (!response.ok) {
        throw new Error('Unable to download STIX export');
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'benin_threat_intel_stix.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } finally {
      setIsStixDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel p-5 fade-rise-in">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="section-title text-2xl">Intelligence nationale</h2>
            <p className="section-subtitle">Observatoire des indicateurs frauduleux consolides a l'echelle nationale.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCsvDownload}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={handleStixDownload}
              disabled={isStixDownloading}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-60"
            >
              <FileJson className="h-4 w-4" />
              STIX-lite
            </button>
          </div>
        </div>
      </section>

      <section className="panel p-5 fade-rise-in-1">
        <h3 className="section-title mb-3">Menaces actives</h3>
        <div className="inline-flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4">
          <AlertTriangle className="h-6 w-6 text-red-300" />
          <span className="text-3xl font-bold text-red-300">{data?.active_threats ?? 0}</span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 fade-rise-in-2">
        <article className="panel p-5">
          <h3 className="section-title mb-4">Top numeros signales</h3>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.top_numbers ?? []} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.20)" />
                  <XAxis type="number" stroke="#94A3B8" allowDecimals={false} />
                  <YAxis type="category" dataKey="masked" stroke="#94A3B8" width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: '1px solid rgba(148,163,184,0.35)',
                      borderRadius: '0.75rem',
                      color: '#E2E8F0',
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {(data?.top_numbers ?? []).map((item) => (
                      <Cell key={item.masked} fill={item.alert ? '#ef4444' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="panel p-5">
          <h3 className="section-title mb-4">Repartition par categorie dominante</h3>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.categories ?? []} dataKey="count" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {(data?.categories ?? []).map((item, index) => (
                      <Cell key={item.name} fill={index % 2 === 0 ? '#0ea5e9' : '#14b8a6'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: '1px solid rgba(148,163,184,0.35)',
                      borderRadius: '0.75rem',
                      color: '#E2E8F0',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
