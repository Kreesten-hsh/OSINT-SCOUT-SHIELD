import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, FileText, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import type { AxiosError } from 'axios';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import PageHero from '@/components/layout/PageHero';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import type { CitizenIncidentAttachment, CitizenIncidentDetailData } from '@/types';
import { alertStatusLabel, alertStatusVariant, channelLabel } from '@/lib/presentation';
import { parseAnalystNotes } from '@/lib/analyst-notes';

type ApiErrorPayload = { message?: string; detail?: string };

interface GeneratedReportData {
  uuid: string;
}

interface IncidentDeleteData {
  alert_uuid: string;
  deleted_reports_count: number;
  deleted_evidences_count: number;
}

function formatDate(value: string): string {
  try {
    return format(new Date(value), 'dd MMM yyyy HH:mm');
  } catch {
    return value;
  }
}

function riskTone(score: number): string {
  if (score >= 80) return 'text-red-400';
  if (score >= 50) return 'text-amber-300';
  return 'text-emerald-300';
}

function toneClass(tone: 'neutral' | 'success' | 'warning'): string {
  if (tone === 'success') return 'border-emerald-500/20 bg-emerald-500/8';
  if (tone === 'warning') return 'border-amber-500/20 bg-amber-500/8';
  return 'border-border/70 bg-secondary/20';
}

function AttachmentPreview({ attachment }: { attachment: CitizenIncidentAttachment }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['citizen-evidence-preview', attachment.evidence_id],
    queryFn: async () => {
      const response = await apiClient.get(attachment.preview_endpoint, { responseType: 'blob' });
      return URL.createObjectURL(response.data);
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    return () => {
      if (data) URL.revokeObjectURL(data);
    };
  }, [data]);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-video bg-secondary/20">
        {isLoading && <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Chargement...</div>}
        {isError && <div className="flex h-full items-center justify-center text-xs text-destructive">Preview indisponible</div>}
        {data && <img src={data} alt={attachment.file_path} className="h-full w-full object-cover" />}
      </div>
      <div className="space-y-1 p-3 text-[11px] text-muted-foreground">
        <p className="truncate">{attachment.file_path}</p>
        <p className="font-mono">SHA-256: {attachment.file_hash.slice(0, 16)}...</p>
        <p>{attachment.captured_at ? formatDate(attachment.captured_at) : '-'}</p>
      </div>
    </article>
  );
}

export default function CitizenIncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: incident, isLoading, isError } = useQuery({
    queryKey: ['citizen-incident', id],
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<CitizenIncidentDetailData>>(`/incidents/citizen/${id}`);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Impossible de charger incident');
      }
      return response.data.data;
    },
    enabled: !!id,
  });

  const reportMutation = useMutation<APIResponse<GeneratedReportData>, AxiosError<ApiErrorPayload>, void>({
    mutationFn: async () => {
      const response = await apiClient.post<APIResponse<GeneratedReportData>>(`/reports/generate/${id}`);
      return response.data;
    },
    onSuccess: (payload) => {
      if (!payload.success || !payload.data) {
        toast({ title: 'Erreur generation dossier', description: payload.message, variant: 'destructive' });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['reports-list'] });
      queryClient.invalidateQueries({ queryKey: ['citizen-incidents'] });
      toast({
        title: 'Dossier genere',
        description: 'Le dossier probatoire est maintenant visible dans la section Dossiers.',
      });
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Erreur generation dossier';
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    },
  });

  const deleteIncidentMutation = useMutation<APIResponse<IncidentDeleteData>, AxiosError<ApiErrorPayload>, void>({
    mutationFn: async () => {
      const response = await apiClient.delete<APIResponse<IncidentDeleteData>>(`/incidents/citizen/${id}`);
      return response.data;
    },
    onSuccess: (payload) => {
      if (!payload.success) {
        toast({ title: 'Suppression impossible', description: payload.message, variant: 'destructive' });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['citizen-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['reports-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Signalement supprime', description: 'Le signalement et ses artefacts ont ete supprimes.' });
      navigate('/admin/signalements');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Erreur suppression signalement';
      toast({ title: 'Suppression impossible', description: msg, variant: 'destructive' });
    },
    onSettled: () => {
      setShowDeleteDialog(false);
    },
  });

  const riskProgress = useMemo(() => Math.min(100, Math.max(0, incident?.risk_score ?? 0)), [incident?.risk_score]);
  const noteEntries = useMemo(() => parseAnalystNotes(incident?.analysis_note), [incident?.analysis_note]);
  const historicalReports = useMemo(
    () => (incident ? incident.stats.confirmed_reports_for_phone + incident.stats.blocked_reports_for_phone : 0),
    [incident],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement du signalement...
      </div>
    );
  }

  if (isError || !incident) {
    return <div className="flex min-h-[60vh] items-center justify-center text-destructive">Impossible de charger ce signalement.</div>;
  }

  return (
    <div className="space-y-5">
      <PageHero
        title={`Dossier #${incident.alert_uuid.slice(0, 8)}`}
        subtitle={`${incident.phone_number} - ${channelLabel(incident.channel)} - ${formatDate(incident.created_at)}`}
        eyebrow={
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/admin/signalements')}
              className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-secondary/30 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Retour aux signalements
            </button>
            <p className="text-xs uppercase tracking-[0.22em] text-primary/90">Signalement citoyen</p>
          </div>
        }
        actions={
          <>
            <Badge variant={alertStatusVariant(incident.status)}>{alertStatusLabel(incident.status)}</Badge>
            <div className="rounded-xl border border-border bg-background/50 px-4 py-2 text-right">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Score risque</p>
              <p className={`text-xl font-semibold ${riskTone(incident.risk_score)}`}>{incident.risk_score}/100</p>
            </div>
          </>
        }
      >
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary/60">
          <div
            className={`h-full rounded-full ${incident.risk_score >= 80 ? 'bg-red-500' : incident.risk_score >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${riskProgress}%` }}
          />
        </div>
      </PageHero>

      <section className="panel p-4 fade-rise-in-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Actions</h2>
            <p className="text-xs text-muted-foreground">Generation du dossier probatoire et consultation des pieces associees.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => reportMutation.mutate()}
              disabled={reportMutation.isPending}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-50"
            >
              {reportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Generer dossier
            </button>
            <Link
              to="/admin/dossiers"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-input px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
            >
              Voir dossiers
            </Link>
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteIncidentMutation.isPending}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
            >
              {deleteIncidentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Supprimer
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 fade-rise-in-2">
        <article className="panel p-4 lg:col-span-2">
          <h2 className="section-title mb-4 text-lg">Contenu du signalement</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-secondary/20 p-3">
              <dt className="text-xs text-muted-foreground">Numero suspect</dt>
              <dd className="font-mono text-xs sm:text-sm">{incident.phone_number}</dd>
            </div>
            <div className="rounded-lg border border-border/70 bg-secondary/20 p-3">
              <dt className="text-xs text-muted-foreground">Canal</dt>
              <dd className="font-medium">{channelLabel(incident.channel)}</dd>
            </div>
            <div className="rounded-lg border border-border/70 bg-secondary/20 p-3 sm:col-span-2">
              <dt className="text-xs text-muted-foreground">URL signalee</dt>
              <dd className="break-all text-xs sm:text-sm">{incident.url || '-'}</dd>
            </div>
            <div className="rounded-lg border border-border/70 bg-secondary/20 p-3 sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Message transmis</dt>
              <dd className="whitespace-pre-wrap text-sm">{incident.message || '-'}</dd>
            </div>
          </dl>
        </article>

        <article className="panel p-4">
          <h2 className="section-title mb-3 text-base">Statistiques numero</h2>
          <div className="space-y-2 text-sm">
            <div className="metric flex items-center justify-between">
              <span>Total signalements</span>
              <span className="font-semibold">{incident.stats.reports_for_phone}</span>
            </div>
            <div className="metric flex items-center justify-between">
              <span>En cours</span>
              <span className="font-semibold">{incident.stats.open_reports_for_phone}</span>
            </div>
            <div className="metric flex items-center justify-between">
              <span>Historiques</span>
              <span className="font-semibold">{historicalReports}</span>
            </div>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3 fade-rise-in-2">
        <article className="panel p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title text-base">Captures citoyen</h2>
            <span className="text-xs text-muted-foreground">{incident.attachments.length} fichier(s)</span>
          </div>
          {incident.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune capture associee a ce signalement.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {incident.attachments.map((attachment) => (
                <AttachmentPreview key={attachment.evidence_id} attachment={attachment} />
              ))}
            </div>
          )}
        </article>

        <article className="panel p-4">
          <h2 className="section-title mb-2 flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-primary" /> Notes d analyse
          </h2>
          {noteEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune note structuree pour le moment.</p>
          ) : (
            <ol className="space-y-2">
              {noteEntries.map((entry) => (
                <li key={entry.id} className={`rounded-xl border p-3 ${toneClass(entry.tone)}`}>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{entry.title}</p>
                  <p className="mt-1 text-sm font-medium">{entry.content}</p>
                  {entry.details.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {entry.details.map((detail, index) => (
                        <li key={`${entry.id}-${index}`} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/80" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </article>
      </section>

      <section className="panel p-4 fade-rise-in-3">
        <h2 className="section-title mb-3 text-base">Incidents lies</h2>
        {incident.related_incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun autre signalement lie a ce numero.</p>
        ) : (
          <div className="space-y-2">
            {incident.related_incidents.map((related) => (
              <Link
                key={related.alert_uuid}
                to={`/admin/signalements/${related.alert_uuid}`}
                className="interactive-row flex items-center justify-between rounded-lg border border-border bg-secondary/15 px-3 py-2 text-xs hover:bg-secondary/30"
              >
                <span className="font-mono">#{related.alert_uuid.slice(0, 8)}</span>
                <span className="text-muted-foreground">{formatDate(related.created_at)}</span>
                <Badge variant={alertStatusVariant(related.status)}>{alertStatusLabel(related.status)}</Badge>
                <span className="font-medium">Score {related.risk_score}/100</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Confirmer la suppression"
        description="Supprimer ce signalement supprimera aussi les preuves et dossiers associes. Cette action est irreversible."
        confirmLabel="Supprimer le signalement"
        isLoading={deleteIncidentMutation.isPending}
        onCancel={() => {
          if (!deleteIncidentMutation.isPending) {
            setShowDeleteDialog(false);
          }
        }}
        onConfirm={() => deleteIncidentMutation.mutate()}
      />
    </div>
  );
}
