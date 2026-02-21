import { useQuery } from '@tanstack/react-query';
import { Clock3, Loader2 } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import type { CitizenIncidentListData } from '@/types';
import { alertStatusLabel, alertStatusVariant, channelLabel } from '@/lib/presentation';
import VerifySignalPanel from '@/features/verify/VerifySignalPanel';

export default function BusinessVerifyPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['business-verify-history'],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<CitizenIncidentListData>>(
        '/incidents/citizen?scope=me&skip=0&limit=10',
      );
      return response.data.data;
    },
  });

  const history = data?.items ?? [];

  return (
    <div className="space-y-5">
      <VerifySignalPanel />

      <section className="panel p-5 fade-rise-in-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="section-title text-xl">Historique de mes signalements</h2>
            <p className="section-subtitle">Derniers incidents soumis depuis votre espace PME.</p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
          >
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock3 className="h-3.5 w-3.5" />}
            Actualiser
          </button>
        </div>

        {isLoading && (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            Chargement de l'historique...
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Impossible de charger l'historique.
          </div>
        )}

        {!isLoading && !isError && history.length === 0 && (
          <div className="rounded-lg border border-border/70 bg-secondary/20 px-4 py-6 text-sm text-muted-foreground">
            Aucun signalement pour le moment.
          </div>
        )}

        {!isLoading && !isError && history.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-secondary/35 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Canal</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Risque</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {history.map((item) => (
                  <tr key={item.alert_uuid} className="bg-card/70">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{channelLabel(item.channel)}</td>
                    <td className="max-w-[360px] px-4 py-3">
                      <p className="line-clamp-2">{item.message_preview}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.risk_score}/100</td>
                    <td className="px-4 py-3">
                      <Badge variant={alertStatusVariant(item.status)}>{alertStatusLabel(item.status)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

