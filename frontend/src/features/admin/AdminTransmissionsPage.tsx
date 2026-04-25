import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, RadioTower, RefreshCcw, Search } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
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
      <section className="panel p-5 fade-rise-in">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="section-title text-2xl">Transmissions externes</h2>
            <p className="section-subtitle">
              Supervision des dossiers transmis vers l ANSSI/OCRC et les operateurs mobiles.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <label className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Reference, ack ou numero"
                className="h-10 w-full rounded-xl border border-input bg-background/70 pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
            </label>
            <select
              value={targetFilter}
              onChange={(event) => setTargetFilter(event.target.value as '' | TransmissionTargetType)}
              className="h-10 rounded-xl border border-input bg-background/70 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
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
              className="h-10 rounded-xl border border-input bg-background/70 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4 fade-rise-in-1">
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">En attente</p>
          <p className="mt-2 text-3xl font-semibold">{data?.pending_count ?? 0}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Relances</p>
          <p className="mt-2 text-3xl font-semibold">{data?.retrying_count ?? 0}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Echecs</p>
          <p className="mt-2 text-3xl font-semibold">{data?.failed_count ?? 0}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Livrees</p>
          <p className="mt-2 text-3xl font-semibold">{data?.delivered_count ?? 0}</p>
        </div>
      </section>

      <section className="panel overflow-hidden fade-rise-in-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-secondary/35 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Cible</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Risque</th>
                <th className="px-4 py-3">Numero</th>
                <th className="px-4 py-3">Tentatives</th>
                <th className="px-4 py-3">Accuse / erreur</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Chargement des transmissions...
                  </td>
                </tr>
              )}

              {isError && !isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-destructive">
                    Impossible de charger les transmissions.
                  </td>
                </tr>
              )}

              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    Aucune transmission pour ce filtre.
                  </td>
                </tr>
              )}

              {items.map((item) => (
                <tr key={item.transmission_uuid} className="bg-card/70 align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{item.public_reference}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.primary_category || 'categorie non renseignee'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{TARGET_LABELS[item.target_type]}</Badge>
                    <p className="mt-2 max-w-xs truncate text-xs text-muted-foreground" title={item.target_endpoint || ''}>
                      {item.target_endpoint || 'endpoint simule'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(item.status)}>{STATUS_LABELS[item.status]}</Badge>
                    <p className="mt-2 text-xs text-muted-foreground">Bundle {item.bundle_status}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold">{item.risk_score}/100</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.suspect_phone_masked}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.attempts}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <p>{item.ack_reference || 'Pas d accuse'}</p>
                    <p className="mt-1 text-destructive/80">{item.last_error || 'Aucune erreur'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <p>Creation {new Date(item.created_at).toLocaleString()}</p>
                    <p className="mt-1">
                      Livraison {item.delivered_at ? new Date(item.delivered_at).toLocaleString() : 'en attente'}
                    </p>
                    <p className="mt-1">
                      Retry {item.next_retry_at ? new Date(item.next_retry_at).toLocaleString() : 'non planifie'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
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
