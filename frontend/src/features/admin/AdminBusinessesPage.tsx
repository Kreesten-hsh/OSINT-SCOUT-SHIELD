import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Loader2, RefreshCcw, Search, ShieldOff, XCircle } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import type { AdminBusinessListData, AdminBusinessListItem, BusinessValidationStatus } from '@/types';

const STATUS_OPTIONS: Array<{ label: string; value: '' | BusinessValidationStatus }> = [
  { label: 'Tous les statuts', value: '' },
  { label: 'En attente', value: 'PENDING_APPROVAL' },
  { label: 'Actives', value: 'ACTIVE' },
  { label: 'Rejetees', value: 'REJECTED' },
  { label: 'Desactivees', value: 'DISABLED' },
];

function statusVariant(status: BusinessValidationStatus): 'outline' | 'success' | 'destructive' | 'secondary' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'REJECTED') return 'destructive';
  if (status === 'DISABLED') return 'secondary';
  return 'outline';
}

export default function AdminBusinessesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | BusinessValidationStatus>('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-pme', statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('q', search.trim());
      const query = params.toString();
      const response = await apiClient.get<APIResponse<AdminBusinessListData>>(`/admin/pme${query ? `?${query}` : ''}`);
      return response.data.data;
    },
  });

  const actionMutation = useMutation<
    APIResponse<AdminBusinessListItem>,
    AxiosError<{ message?: string }>,
    { businessUuid: string; action: 'approve' | 'reject' | 'disable' }
  >({
    mutationFn: async ({ businessUuid, action }) => {
      const response = await apiClient.patch<APIResponse<AdminBusinessListItem>>(`/admin/pme/${businessUuid}/${action}`);
      return response.data;
    },
    onSuccess: (payload, variables) => {
      if (!payload.success) {
        toast({
          title: 'Action impossible',
          description: payload.message || "La mise a jour du statut PME a echoue.",
          variant: 'destructive',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['admin-pme'] });
      toast({
        title: 'Statut PME mis a jour',
        description: `Action ${variables.action} appliquee a ${payload.data?.official_name || 'la PME'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Action impossible',
        description: error.response?.data?.message || "La mise a jour du statut PME a echoue.",
        variant: 'destructive',
      });
    },
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <section className="panel p-5 fade-rise-in">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="section-title text-2xl">Gestion des PME</h2>
            <p className="section-subtitle">Validation des comptes, suivi des fiches entreprise et acces aux details PME.</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <label className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher PME ou email"
                className="h-10 w-full rounded-xl border border-input bg-background/70 pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as '' | BusinessValidationStatus)}
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
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Actives</p>
          <p className="mt-2 text-3xl font-semibold">{data?.active_count ?? 0}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Rejetees</p>
          <p className="mt-2 text-3xl font-semibold">{data?.rejected_count ?? 0}</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Desactivees</p>
          <p className="mt-2 text-3xl font-semibold">{data?.disabled_count ?? 0}</p>
        </div>
      </section>

      <section className="panel overflow-hidden fade-rise-in-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-secondary/35 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">PME</th>
                <th className="px-4 py-3">Compte</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Cles</th>
                <th className="px-4 py-3">Numeros</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Creation</th>
                <th className="px-4 py-3">Fiche</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Chargement des PME...
                  </td>
                </tr>
              )}

              {isError && !isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-destructive">
                    Impossible de charger la liste des PME.
                  </td>
                </tr>
              )}

              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    Aucune PME pour ce filtre.
                  </td>
                </tr>
              )}

              {items.map((item) => (
                <tr key={item.business_uuid} className="bg-card/70">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{item.official_name}</p>
                    <p className="text-xs text-muted-foreground">ID utilisateur {item.user_id}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(item.validation_status)}>{item.validation_status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.keywords_count}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.legit_numbers_count}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <p>{item.contact_email || 'Email non renseigne'}</p>
                    <p>{item.contact_phone || 'Telephone non renseigne'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/pme/${item.business_uuid}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                    >
                      Ouvrir
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => actionMutation.mutate({ businessUuid: item.business_uuid, action: 'approve' })}
                        disabled={actionMutation.isPending || item.validation_status === 'ACTIVE'}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Valider
                      </button>
                      <button
                        type="button"
                        onClick={() => actionMutation.mutate({ businessUuid: item.business_uuid, action: 'reject' })}
                        disabled={actionMutation.isPending || item.validation_status === 'REJECTED'}
                        className="inline-flex items-center gap-1 rounded-lg border border-destructive/35 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-40"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Rejeter
                      </button>
                      <button
                        type="button"
                        onClick={() => actionMutation.mutate({ businessUuid: item.business_uuid, action: 'disable' })}
                        disabled={actionMutation.isPending || item.validation_status === 'DISABLED'}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-40"
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                        Desactiver
                      </button>
                    </div>
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
