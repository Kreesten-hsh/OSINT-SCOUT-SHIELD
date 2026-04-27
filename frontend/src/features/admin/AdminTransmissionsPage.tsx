import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, RadioTower, RefreshCcw, Search } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import PageHero from '@/components/layout/PageHero';
import { Badge } from '@/components/ui/badge';
import type { AdminTransmissionListData, TransmissionStatus, TransmissionTargetType } from '@/types';

const STATUS_OPTIONS: Array<{ label: string; value: '' | TransmissionStatus }> = [
  { label: 'Tous les statuts', value: '' },
  { label: 'En attente', value: 'PENDING' },
  { label: 'En file', value: 'QUEUED' },
  { label: 'Envoyees', value: 'SENT' },
  { label: 'Relance', value: 'RETRYING' },
  { label: 'Echecs', value: 'FAILED' },
  { label: 'Livrees', value: 'DELIVERED' },
];

const TARGET_OPTIONS: Array<{ label: string; value: '' | TransmissionTargetType }> = [
  { label: 'Toutes les cibles', value: '' },
  { label: 'ANSSI/OCRC', value: 'ANSSI_OCRC' },
  { label: 'Operateurs', value: 'OPERATORS' },
];

const TARGET_LABELS: Record<TransmissionTargetType, string> = {
  ANSSI_OCRC: 'ANSSI/OCRC',
  OPERATORS: 'Operateurs',
};

const STATUS_LABELS: Record<TransmissionStatus, string> = {
  PENDING: 'En attente',
  QUEUED: 'En file',
  SENT: 'Envoyee',
  RETRYING: 'Relance',
  FAILED: 'Echec',
  DELIVERED: 'Livree',
};

function statusVariant(status: TransmissionStatus): 'outline' | 'secondary' | 'warning' | 'destructive' | 'success' {
  if (status === 'FAILED') return 'destructive';
  if (status === 'DELIVERED') return 'success';
  if (status === 'RETRYING') return 'warning';
  if (status === 'QUEUED' || status === 'SENT') return 'secondary';
  return 'outline';
}

export default function AdminTransmissionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | TransmissionStatus>('');
  const [targetFilter, setTargetFilter] = useState<'' | TransmissionTargetType>('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-transmissions', search, statusFilter, targetFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      if (targetFilter) params.set('target', targetFilter);
      const query = params.toString();
      const response = await apiClient.get<APIResponse<AdminTransmissionListData>>(
        `/admin/transmissions${query ? `?${query}` : ''}`,
      );
      return response.data.data;
    },
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <PageHero
        title="Transmissions externes"
        subtitle="Supervision des dossiers transmis vers l ANSSI/OCRC et les operateurs mobiles."
        actions={
          <button onClick={() => refetch()} className="hero-action-secondary">
            <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        }
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Reference, ack ou numero"
              className="hero-search-field w-full"
            />
          </label>
          <select
            value={targetFilter}
            onChange={(event) => setTargetFilter(event.target.value as '' | TransmissionTargetType)}
            className="hero-field"
          >
            {TARGET_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as '' | TransmissionStatus)}
            className="hero-field"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </PageHero>

      <section className="grid gap-4 md:grid-cols-4 fade-rise-in-1">
        <div className="metric-card">
          <p className="metric-card-label">En attente</p>
          <p className="metric-card-value">{data?.pending_count ?? 0}</p>
        </div>
        <div className="metric-card">
          <p className="metric-card-label">Relances</p>
          <p className="metric-card-value">{data?.retrying_count ?? 0}</p>
        </div>
        <div className="metric-card">
          <p className="metric-card-label">Echecs</p>
          <p className="metric-card-value">{data?.failed_count ?? 0}</p>
        </div>
        <div className="metric-card">
          <p className="metric-card-label">Livrees</p>
          <p className="metric-card-value">{data?.delivered_count ?? 0}</p>
        </div>
      </section>

      <section className="table-shell fade-rise-in-2">
        <div className="table-scroll">
          <table className="table-base min-w-[1180px]">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Cible</th>
                <th>Statut</th>
                <th>Risque</th>
                <th>Numero</th>
                <th>Tentatives</th>
                <th>Accuse / erreur</th>
                <th>Dates</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="table-empty">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Chargement des transmissions...
                  </td>
                </tr>
              )}

              {isError && !isLoading && (
                <tr>
                  <td colSpan={9} className="table-empty text-destructive">
                    Impossible de charger les transmissions.
                  </td>
                </tr>
              )}

              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={9} className="table-empty">
                    Aucune transmission pour ce filtre.
                  </td>
                </tr>
              )}

              {items.map((item) => (
                <tr key={item.transmission_uuid} className="table-row">
                  <td>
                    <p className="font-semibold">{item.public_reference}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.primary_category || 'categorie non renseignee'}</p>
                  </td>
                  <td>
                    <Badge variant="outline">{TARGET_LABELS[item.target_type]}</Badge>
                    <p className="mt-2 max-w-xs truncate text-xs text-muted-foreground" title={item.target_endpoint || ''}>
                      {item.target_endpoint || 'endpoint simule'}
                    </p>
                  </td>
                  <td>
                    <Badge variant={statusVariant(item.status)}>{STATUS_LABELS[item.status]}</Badge>
                    <p className="mt-2 text-xs text-muted-foreground">Bundle {item.bundle_status}</p>
                  </td>
                  <td className="font-semibold">{item.risk_score}/100</td>
                  <td className="text-xs text-muted-foreground">{item.suspect_phone_masked}</td>
                  <td className="text-xs text-muted-foreground">{item.attempts}</td>
                  <td className="text-xs text-muted-foreground">
                    <p>{item.ack_reference || 'Pas d accuse'}</p>
                    <p className="mt-1 text-destructive/80">{item.last_error || 'Aucune erreur'}</p>
                  </td>
                  <td className="text-xs text-muted-foreground">
                    <p>Creation {new Date(item.created_at).toLocaleString()}</p>
                    <p className="mt-1">
                      Livraison {item.delivered_at ? new Date(item.delivered_at).toLocaleString() : 'en attente'}
                    </p>
                    <p className="mt-1">
                      Retry {item.next_retry_at ? new Date(item.next_retry_at).toLocaleString() : 'non planifie'}
                    </p>
                  </td>
                  <td className="text-right">
                    <Link
                      to={`/admin/signalements/${item.report_uuid}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                    >
                      <RadioTower className="h-3.5 w-3.5" />
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
