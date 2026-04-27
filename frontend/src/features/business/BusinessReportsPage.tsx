import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Loader2, RefreshCcw } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import PageHero from '@/components/layout/PageHero';
import { useToast } from '@/components/ui/use-toast';
import { downloadApiFile } from '@/lib/download';
import { riskTone } from '@/lib/presentation';
import type { PmeBundleListData } from '@/types';

export default function BusinessReportsPage() {
  const { toast } = useToast();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['pme-dossiers'],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<PmeBundleListData>>('/pme/dossiers?skip=0&limit=50');
      return response.data.data;
    },
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <PageHero
        title="Dossiers probatoires"
        subtitle="Bundles forensiques relies aux signalements qui usurpent votre identite."
        actions={
          <button onClick={() => refetch()} className="hero-action-secondary">
            <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        }
      />

      {isLoading && (
        <section className="panel flex min-h-56 items-center justify-center text-muted-foreground fade-rise-in-1">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement des dossiers...
        </section>
      )}

      {isError && !isLoading && (
        <section className="panel border-destructive/25 bg-destructive/10 p-8 text-center fade-rise-in-1">
          <p className="text-sm font-semibold text-destructive">Impossible de charger les dossiers PME.</p>
        </section>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <section className="panel border-dashed p-10 text-center fade-rise-in-1">
          <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold">Aucun dossier disponible</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Les dossiers apparaitront ici des qu'un bundle forensique sera genere pour un signalement vous concernant.
          </p>
        </section>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <section className="space-y-3 fade-rise-in-1">
          {items.map((item) => (
            <article key={item.report_uuid} className="panel p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-primary">{item.public_reference}</span>
                    <span className={`text-sm font-semibold ${riskTone(item.risk_score)}`}>Risque {item.risk_score}</span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {item.bundle_status}
                    </span>
                  </div>
                  <h3 className="max-w-3xl text-base font-semibold">{item.message_preview}</h3>
                  <p className="text-xs text-muted-foreground">
                    {item.created_at ? `Genere le ${new Date(item.created_at).toLocaleString()}` : 'Bundle non encore genere'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {item.bundle_uuid ? (
                    <>
                      <button
                        onClick={async () => {
                          try {
                            await downloadApiFile(`/reports/${item.bundle_uuid}/download/pdf`, `dossier_${item.bundle_uuid}.pdf`);
                          } catch {
                            toast({
                              title: 'Telechargement impossible',
                              description: 'Le PDF du dossier est indisponible.',
                              variant: 'destructive',
                            });
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/25"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await downloadApiFile(`/reports/${item.bundle_uuid}/download/json`, `dossier_${item.bundle_uuid}.json`);
                          } catch {
                            toast({
                              title: 'Telechargement impossible',
                              description: 'Le JSON du dossier est indisponible.',
                              variant: 'destructive',
                            });
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
                      >
                        JSON
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await downloadApiFile(`/reports/${item.bundle_uuid}/download/case-bundle`, `dossier_${item.bundle_uuid}.zip`);
                          } catch {
                            toast({
                              title: 'Telechargement impossible',
                              description: 'Le ZIP probatoire est indisponible.',
                              variant: 'destructive',
                            });
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                      >
                        ZIP
                      </button>
                    </>
                  ) : (
                    <span className="rounded-lg border border-amber-500/30 bg-amber-500/12 px-3 py-2 text-xs text-amber-300">
                      En attente de generation par l'administration
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
