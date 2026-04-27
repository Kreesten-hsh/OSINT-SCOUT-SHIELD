import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCcw } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import PageHero from '@/components/layout/PageHero';
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
      <PageHero
        title="Signalements lies"
        subtitle="Dossiers citoyens relies a votre identite, avec reference publique et pieces disponibles."
        actions={
          <button onClick={() => refetch()} className="hero-action-secondary">
            <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        }
      />

      <section className="table-shell fade-rise-in-1">
        <div className="table-scroll">
          <table className="table-base min-w-[860px]">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Canal</th>
                <th>Message</th>
                <th>Numero</th>
                <th>Risque</th>
                <th>Statut</th>
                <th>Pieces</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="table-empty">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Chargement des signalements...
                  </td>
                </tr>
              )}

              {isError && !isLoading && (
                <tr>
                  <td colSpan={8} className="table-empty text-destructive">
                    Impossible de charger les signalements lies.
                  </td>
                </tr>
              )}

              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="table-empty">
                    Aucun signalement lie a votre PME pour le moment.
                  </td>
                </tr>
              )}

              {items.map((item) => (
                <tr key={item.report_uuid} className="table-row">
                  <td className="font-mono text-xs text-primary">{item.public_reference}</td>
                  <td className="text-xs text-muted-foreground">{channelLabel(item.channel)}</td>
                  <td className="max-w-[340px]">
                    <p className="line-clamp-2">{item.message_preview}</p>
                  </td>
                  <td className="text-xs text-muted-foreground">{item.suspect_phone_masked}</td>
                  <td className="font-mono text-xs text-muted-foreground">{item.risk_score}/100</td>
                  <td>
                    <Badge variant={alertStatusVariant(item.report_status)}>{alertStatusLabel(item.report_status)}</Badge>
                  </td>
                  <td className="text-xs text-muted-foreground">
                    {item.attachments_count} capture(s) / {item.bundles_count} dossier(s)
                  </td>
                  <td className="text-xs text-muted-foreground">
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
