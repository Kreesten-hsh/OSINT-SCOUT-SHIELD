import { useEffect, useRef, useState } from 'react';

import { mapIntensityColor } from '@/lib/benin';
import type { DepartmentMapPoint } from '@/types';

declare const window: Window & { L?: any };

interface BeninSignalMapProps {
  departments: DepartmentMapPoint[];
  selectedDepartment?: string | null;
  onDepartmentSelect?: (department: string) => void;
  compact?: boolean;
  className?: string;
}

function markerRadius(count: number, compact: boolean): number {
  const base = compact ? 8 : 10;
  return Math.min(base + count * (compact ? 1.3 : 1.8), compact ? 18 : 24);
}

export default function BeninSignalMap({
  departments,
  selectedDepartment,
  onDepartmentSelect,
  compact = false,
  className = '',
}: BeninSignalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState<boolean>(Boolean(window.L));

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
      zoom: compact ? 7 : 8,
      zoomControl: !compact,
      dragging: !compact,
      scrollWheelZoom: !compact,
      doubleClickZoom: !compact,
      boxZoom: !compact,
      keyboard: !compact,
      tap: !compact,
      touchZoom: !compact,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = layer;

    window.setTimeout(() => {
      map.invalidateSize();
    }, 120);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, [compact, leafletReady]);

  useEffect(() => {
    if (!leafletReady || !window.L || !markersLayerRef.current || !mapRef.current) {
      return;
    }

    const L = window.L;
    markersLayerRef.current.clearLayers();

    for (const point of departments) {
      const selected = selectedDepartment === point.department;
      const color = mapIntensityColor(point.count);
      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: markerRadius(point.count, compact) + (selected ? 3 : 0),
        color: selected ? '#f8fafc' : color,
        fillColor: color,
        fillOpacity: selected ? 0.82 : 0.5,
        weight: selected ? 3 : 2,
      });

      marker.bindPopup(
        `
        <div style="min-width:180px">
          <strong>${point.department}</strong><br/>
          Signalements: ${point.count}<br/>
          Haut risque: ${point.high_risk_count}<br/>
          Categorie: ${point.dominant_category ?? 'Non classee'}
        </div>
        `,
      );

      marker.on('click', () => {
        onDepartmentSelect?.(point.department);
      });

      marker.addTo(markersLayerRef.current);
    }
  }, [compact, departments, leafletReady, onDepartmentSelect, selectedDepartment]);

  return <div ref={mapContainerRef} className={className} />;
}
