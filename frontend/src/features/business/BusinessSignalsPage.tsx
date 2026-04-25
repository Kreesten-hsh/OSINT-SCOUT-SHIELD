import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCcw } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { alertStatusLabel, alertStatusVariant, channelLabel } from '@/lib/presentation';
import type { PmeSignalementListData } from '@/types';

export default function BusinessSignalsPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['pme-signalements'],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<PmeSignalementListData>>('/pme/signalements?skip=0&limit=50');
      return response.data.data;
    },
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <section className="panel p-5 fade-rise-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title text-2xl">Signalements lies</h2>
            <p className="section-subtitle">
              Dossiers citoyens relies a votre identite, avec reference publique et pieces disponibles.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </section>

      <section className="panel overflow-hidden fade-rise-in-1">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-secondary/35 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Numero</th>
                <th className="px-4 py-3">Risque</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Pieces</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Chargement des signalements...
                  </td>
                </tr>
              )}

              {isError && !isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-destructive">
                    Impossible de charger les signalements lies.
                  </td>
                </tr>
              )}

              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    Aucun signalement lie a votre PME pour le moment.
                  </td>
                </tr>
              )}

              {items.map((item) => (
                <tr key={item.report_uuid} className="bg-card/70">
                  <td className="px-4 py-3 font-mono text-xs text-primary">{item.public_reference}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{channelLabel(item.channel)}</td>
                  <td className="max-w-[340px] px-4 py-3">
                    <p className="line-clamp-2">{item.message_preview}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.suspect_phone_masked}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.risk_score}/100</td>
                  <td className="px-4 py-3">
                    <Badge variant={alertStatusVariant(item.report_status)}>{alertStatusLabel(item.report_status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {item.attachments_count} capture(s) / {item.bundles_count} dossier(s)
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
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
