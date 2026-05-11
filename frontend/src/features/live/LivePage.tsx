import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, Loader2, MapPinned, RadioTower, RefreshCcw } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import PageHero from '@/components/layout/PageHero';
import { Badge } from '@/components/ui/badge';
import { categoryLabel } from '@/lib/presentation';
import type { DepartmentMapPoint, MapOverviewData, MapRiskFilter, MapWindowFilter } from '@/types';
import BeninSignalMap from '@/features/live/BeninSignalMap';

const RISK_OPTIONS: Array<{ value: MapRiskFilter; label: string }> = [
  { value: 'all', label: 'Tous les risques' },
  { value: 'high', label: 'Haut risque' },
  { value: 'medium', label: 'Risque moyen' },
  { value: 'low', label: 'Risque faible' },
];

const WINDOW_OPTIONS: Array<{ value: MapWindowFilter; label: string }> = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
];

export default function LivePage() {
  const [windowFilter, setWindowFilter] = useState<MapWindowFilter>('7d');
  const [riskFilter, setRiskFilter] = useState<MapRiskFilter>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['map-overview', windowFilter, riskFilter],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<MapOverviewData>>('/map/overview', {
        params: { window: windowFilter, risk: riskFilter },
      });
      return response.data.data;
    },
  });

  const activeDepartment = useMemo<DepartmentMapPoint | null>(() => {
    if (!data?.departments?.length) {
      return null;
    }
    if (selectedDepartment) {
      return data.departments.find((item) => item.department === selectedDepartment) ?? data.top_departments[0] ?? data.departments[0];
    }
    return data.top_departments[0] ?? data.departments[0];
  }, [data?.departments, data?.top_departments, selectedDepartment]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px]">
          <PageHero
            title="Carte vivante des signalements"
            subtitle="Vue territoriale des signalements citoyens, des foyers de risque et des transmissions associees."
            eyebrow={
              <>
                <Badge variant="secondary">Veille nationale</Badge>
                <Badge variant="outline">Carte Benin</Badge>
              </>
            }
            actions={
              <button onClick={() => refetch()} className="hero-action-secondary">
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Actualiser
              </button>
            }
            toolbarClassName="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-border bg-background/55 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Signalements</p>
                <p className="mt-3 text-3xl font-semibold">{data?.total_reports ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/55 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Haut risque</p>
                <p className="mt-3 text-3xl font-semibold text-red-500">{data?.high_risk_reports ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/55 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Departements actifs</p>
                <p className="mt-3 text-3xl font-semibold">{data?.active_departments ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/55 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Categorie dominante</p>
                <p className="mt-3 text-lg font-semibold">{categoryLabel(data?.dominant_category)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4 text-primary" />
                Filtres de lecture territoriale
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={windowFilter}
                  onChange={(event) => setWindowFilter(event.target.value as MapWindowFilter)}
                  className="hero-field"
                >
                  {WINDOW_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={riskFilter}
                  onChange={(event) => setRiskFilter(event.target.value as MapRiskFilter)}
                  className="hero-field"
                >
                  {RISK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </PageHero>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <section className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-border bg-card text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement de la carte nationale...
          </section>
        ) : isError || !data ? (
          <section className="rounded-3xl border border-red-500/25 bg-red-500/10 p-8 text-center text-destructive">
            Impossible de charger la carte nationale.
          </section>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <section className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold">Carte du Benin</h2>
                  <p className="text-sm text-muted-foreground">Clique sur un departement pour afficher ses details.</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    faible
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    moyen
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    fort
                  </span>
                </div>
              </div>
              <BeninSignalMap
                departments={data.departments}
                selectedDepartment={activeDepartment?.department ?? null}
                onDepartmentSelect={setSelectedDepartment}
                className="h-[420px] w-full md:h-[520px]"
              />
            </section>

            <section className="space-y-5">
              <article className="rounded-3xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <MapPinned className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Focus departement</h2>
                </div>
                {activeDepartment ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-2xl font-semibold">{activeDepartment.department}</p>
                      <p className="text-sm text-muted-foreground">
                        Derniere activite{' '}
                        {activeDepartment.latest_report_at ? new Date(activeDepartment.latest_report_at).toLocaleString() : 'non disponible'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-border bg-background/55 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Signalements</p>
                        <p className="mt-2 text-3xl font-semibold">{activeDepartment.count}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-background/55 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Haut risque</p>
                        <p className="mt-2 text-3xl font-semibold text-red-500">{activeDepartment.high_risk_count}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-background/55 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Categorie dominante</p>
                      <p className="mt-2 text-lg font-semibold">{categoryLabel(activeDepartment.dominant_category)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Aucun departement actif sur la fenetre selectionnee.</p>
                )}
              </article>

              <article className="rounded-3xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold">Departements les plus touches</h2>
                <div className="mt-4 space-y-3">
                  {data.top_departments.length === 0 ? (
                    <p className="text-sm text-slate-400">Aucune activite cartographique disponible.</p>
                  ) : (
                    data.top_departments.map((department) => (
                      <button
                        key={department.department}
                        type="button"
                        onClick={() => setSelectedDepartment(department.department)}
                        className="flex w-full items-center justify-between rounded-2xl border border-border bg-background/55 px-4 py-3 text-left transition hover:bg-secondary/40"
                      >
                        <div>
                          <p className="font-semibold">{department.department}</p>
                          <p className="text-xs text-muted-foreground">{categoryLabel(department.dominant_category)}</p>
                        </div>
                        <span className="text-xl font-semibold">{department.count}</span>
                      </button>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-3xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <RadioTower className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Transmissions recentes</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {data.recent_transmissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune transmission recente.</p>
                  ) : (
                    data.recent_transmissions.map((item) => (
                      <div key={item.transmission_uuid} className="rounded-2xl border border-border bg-background/55 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-xs text-primary">{item.public_reference}</p>
                            <p className="mt-1 text-sm text-foreground">{item.department || 'Departement non renseigne'}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.target_type}</p>
                          </div>
                          <Badge variant={item.status === 'FAILED' ? 'destructive' : item.status === 'DELIVERED' ? 'success' : 'secondary'}>
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
