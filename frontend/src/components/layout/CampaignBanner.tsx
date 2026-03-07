import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';

interface CampaignAlert {
  id: string;
  type: string;
  count: number;
  region: string | null;
  first_seen: string;
  last_seen: string;
}

interface CampaignSummaryResponse {
  active_campaigns: CampaignAlert[];
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('fr-FR');
}

export function CampaignBanner() {
  const { data, isLoading } = useQuery({
    queryKey: ['campaign-summary'],
    queryFn: async () => {
      const response = await apiClient.get<CampaignSummaryResponse>('/dashboard/intel/summary');
      return response.data;
    },
    refetchInterval: 60_000,
  });

  const campaigns = data?.active_campaigns ?? [];
  if (isLoading || campaigns.length === 0) {
    return null;
  }

  const primary = campaigns[0];
  const extraCount = campaigns.length - 1;

  return (
    <div className="bg-red-900/80 border-b border-red-500 text-red-100 text-sm px-4 py-2 flex items-center justify-between">
      <p className="truncate">
        {'⚠️ Campagne active — '}
        {primary.count} signalements de type {primary.type}
        {primary.region ? ` dans ${primary.region}` : ''}
        {' depuis '}
        {formatDate(primary.first_seen)}
      </p>
      {extraCount > 0 ? <span className="ml-3 shrink-0">(+{extraCount} autre(s))</span> : null}
    </div>
  );
}
