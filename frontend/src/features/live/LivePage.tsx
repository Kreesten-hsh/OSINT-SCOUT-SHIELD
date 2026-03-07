import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';

declare const window: Window & { L?: any };

type HeatmapPoint = {
  region: string;
  count: number;
  dominant_type: string;
};

type DashboardStats = {
  incidents_by_day: Array<{ date: string; count: number }>;
  incidents_by_risk: { HIGH: number; MEDIUM: number; LOW: number };
  incidents_by_status: Record<string, number>;
};

const REGION_COORDS: Record<string, [number, number]> = {
  Atlantique: [6.3676, 2.4252],
  Littoral: [6.3654, 2.4183],
  'Ouémé': [6.49, 2.63],
  Borgou: [10.23, 2.77],
  Zou: [7.17, 2.09],
  Mono: [6.9, 1.66],
  Couffo: [7.0, 1.75],
  Atacora: [10.63, 1.65],
  Donga: [9.74, 1.67],
  Collines: [8.39, 2.27],
  Plateau: [7.21, 2.98],
  Alibori: [11.33, 2.78],
};

function markerColor(count: number): string {
  if (count > 10) {
    return '#ef4444';
  }
  if (count > 5) {
    return '#f59e0b';
  }
  return '#22c55e';
}

export default function LivePage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState<boolean>(Boolean(window.L));

  const { data: heatmap = [] } = useQuery({
    queryKey: ['live', 'heatmap'],
    queryFn: async () => {
      const response = await apiClient.get<HeatmapPoint[]>('/map/heatmap');
      return response.data;
    },
    refetchInterval: 30_000,
  });

  const { data: liveStats } = useQuery({
    queryKey: ['live', 'stats'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<DashboardStats>('/dashboard/stats');
        return response.data;
      } catch (_error) {
        return null;
      }
    },
    refetchInterval: 30_000,
  });

  const totals = useMemo(() => {
    const totalHigh = liveStats?.incidents_by_risk?.HIGH ?? 0;
    const totalIncidents = (liveStats?.incidents_by_day ?? []).reduce((acc, item) => acc + item.count, 0);
    return { totalHigh, totalIncidents };
  }, [liveStats]);

  useEffect(() => {
    if (window.L) {
      setLeafletReady(true);
      return;
    }

    let cancelled = false;
    const cssId = 'leaflet-cdn-css';
    const scriptId = 'leaflet-cdn-js';

    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.L) {
        setLeafletReady(true);
      } else {
        existingScript.addEventListener('load', () => {
          if (!cancelled) {
            setLeafletReady(true);
          }
        });
      }
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      if (!cancelled) {
        setLeafletReady(true);
      }
    };
    document.body.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!leafletReady || !window.L || !mapContainerRef.current || mapRef.current) {
      return;
    }

    const L = window.L;
    const map = L.map(mapContainerRef.current, {
      center: [9.3077, 2.3158],
      zoom: 7,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = layer;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, [leafletReady]);

  useEffect(() => {
    if (!leafletReady || !window.L || !markersLayerRef.current) {
      return;
    }

    const L = window.L;
    markersLayerRef.current.clearLayers();

    for (const point of heatmap) {
      const coords = REGION_COORDS[point.region];
      if (!coords) {
        continue;
      }
      const color = markerColor(point.count);
      const marker = L.circleMarker(coords, {
        radius: Math.min(8 + point.count, 25),
        color,
        fillColor: color,
        fillOpacity: 0.45,
        weight: 2,
      });
      marker.bindPopup(`${point.region} - ${point.count} signalements`);
      marker.addTo(markersLayerRef.current);
    }
  }, [heatmap, leafletReady]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">Carte vivante des signalements</h1>
        <p className="mt-1 text-sm text-slate-400">Observatoire national de threat intelligence</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5">
            total_high: <span className="font-semibold text-red-300">{totals.totalHigh}</span>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5">
            total_incidents: <span className="font-semibold">{totals.totalIncidents}</span>
          </div>
        </div>
      </header>

      <main className="h-[calc(100vh-138px)] p-4">
        <div ref={mapContainerRef} className="h-full w-full rounded-xl border border-slate-800 bg-slate-900" />
      </main>
    </div>
  );
}
