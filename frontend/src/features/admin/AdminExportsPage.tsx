import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { useToast } from '@/components/ui/use-toast';
import { downloadApiFile } from '@/lib/download';
import type { AdminDashboardData } from '@/types';

export default function AdminExportsPage() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<'csv' | 'stix' | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard', 'exports-summary'],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<AdminDashboardData>>('/admin/dashboard');
      return response.data.data;
    },
  });

  const handleDownload = async (kind: 'csv' | 'stix') => {
    setDownloading(kind);
    try {
      if (kind === 'csv') {
        await downloadApiFile('/admin/exports/csv', 'benin_cyber_shield_admin_export.csv', { method: 'POST' });
      } else {
        await downloadApiFile('/admin/exports/stix-lite', 'benin_cyber_shield_admin_stix_lite.json', { method: 'POST' });
      }
    } catch {
      toast({
        title: 'Export impossible',
        description: "Le fichier n'a pas pu etre genere.",
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="panel p-5 fade-rise-in">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="section-title text-2xl">Exports admin</h2>
            <p className="section-subtitle">
              Extraction des signalements, bundles et transmissions du nouveau domaine BENIN CYBER SHIELD.
            </p>
          </div>
          <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-background/50 px-3 py-2">
              <p>Signalements</p>
              <p className="mt-1 text-base font-semibold text-foreground">{data?.total_reports ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/50 px-3 py-2">
              <p>Dossiers prets</p>
              <p className="mt-1 text-base font-semibold text-foreground">{data?.bundles_ready ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/50 px-3 py-2">
              <p>Transmissions en cours</p>
              <p className="mt-1 text-base font-semibold text-foreground">{data?.transmissions_pending ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 fade-rise-in-1">
        <article className="panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2 text-emerald-300">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Export CSV</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Vue tabulaire exploitable rapidement pour revue interne, statistiques, tri et partage academique.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>References publiques des signalements</li>
                <li>Statut, score, categorie et canal</li>
                <li>Numeros suspects masques et PME ciblees</li>
                <li>Etat des bundles et des transmissions</li>
              </ul>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleDownload('csv')}
            disabled={downloading !== null}
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {downloading === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Telecharger le CSV
          </button>
        </article>

        <article className="panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-xl border border-sky-500/25 bg-sky-500/10 p-2 text-sky-300">
                <FileJson className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Export STIX-lite</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Bundle JSON structure pour transmission inter-systemes, maquettes d interop et future connexion ANSSI/OCRC.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>Incidents agreges dans un bundle unique</li>
                <li>Metadonnees de risque et de categorie</li>
                <li>References publiques, bundles et transmissions</li>
                <li>Format volontairement leger et branchable</li>
              </ul>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleDownload('stix')}
            disabled={downloading !== null}
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
          >
            {downloading === 'stix' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Telecharger le STIX-lite
          </button>
        </article>
      </section>

      <section className="panel p-5 fade-rise-in-2">
        <h3 className="section-title">Perimetre actuel</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Les exports s appuient sur le nouveau domaine memoire. Les numeros restent masques dans ces fichiers.
          Les transmissions reelles ANSSI/OCRC conservent leur propre voie autorisee via le stockage chiffre cote backend.
        </p>
        {isLoading ? (
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement du resume...
          </div>
        ) : null}
      </section>
    </div>
  );
}
