import { useMemo, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, UploadCloud } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { channelLabel } from '@/lib/presentation';

type SignalChannel = 'MOBILE_APP' | 'WEB_PORTAL';
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface VerifySignalData {
  risk_score: number;
  risk_level: RiskLevel;
  explanation: string[];
  should_report: boolean;
  matched_rules: string[];
  recurrence_count: number;
}

interface IncidentReportData {
  alert_uuid: string;
  status: 'NEW';
  risk_score_initial: number;
  queued_for_osint: boolean;
}

function detectCitizenChannel(): SignalChannel {
  if (typeof window === 'undefined') {
    return 'WEB_PORTAL';
  }

  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isStandalone ? 'MOBILE_APP' : 'WEB_PORTAL';
}

export default function VerifySignalPanel() {
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [channel] = useState<SignalChannel>(() => detectCitizenChannel());
  const [loading, setLoading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifySignalData | null>(null);
  const [incident, setIncident] = useState<IncidentReportData | null>(null);

  const normalizedPhone = useMemo(() => phone.trim(), [phone]);
  const canSubmit = message.trim().length >= 5 && normalizedPhone.length >= 8;

  const onFilesChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(event.target.files || []);
    setScreenshots(fileList);
  };

  const submitVerify = async () => {
    setError(null);
    setIncident(null);
    setLoading(true);

    try {
      const payload = {
        message,
        url: url.trim() || null,
        phone: normalizedPhone,
        channel,
      };

      const response = await apiClient.post<APIResponse<VerifySignalData>>('/signals/verify', payload);
      setResult(response.data.data ?? null);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.response?.data?.detail || 'Erreur de verification');
      } else {
        setError('Erreur de verification');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitReport = async () => {
    if (!result) return;

    setError(null);
    setReporting(true);

    try {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('phone', normalizedPhone);
      formData.append('channel', channel);
      if (url.trim()) {
        formData.append('url', url.trim());
      }

      formData.append(
        'verification',
        JSON.stringify({
          risk_score: result.risk_score,
          risk_level: result.risk_level,
          should_report: result.should_report,
          matched_rules: result.matched_rules,
        }),
      );

      for (const file of screenshots) {
        formData.append('screenshots', file);
      }

      const response = await apiClient.post<APIResponse<IncidentReportData>>('/incidents/report-with-media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setIncident(response.data.data ?? null);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.response?.data?.detail || 'Erreur de signalement');
      } else {
        setError('Erreur de signalement');
      }
    } finally {
      setReporting(false);
    }
  };

  const levelColor =
    result?.risk_level === 'HIGH' ? 'text-red-400' : result?.risk_level === 'MEDIUM' ? 'text-amber-300' : 'text-emerald-300';

  return (
    <>
      <section className="panel soft-grid relative overflow-hidden p-6 md:p-8 fade-rise-in">
        <div className="pointer-events-none absolute -right-24 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative z-10 mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs uppercase tracking-wide text-primary">
            <ShieldAlert className="h-3.5 w-3.5" />
            Canal citoyen
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight md:text-3xl">
            Verification et signalement anti-arnaque
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Canal detecte automatiquement: <span className="font-medium text-foreground">{channelLabel(channel)}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Message suspect</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-32 w-full rounded-xl border border-input bg-background/70 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              placeholder="Collez ici le contenu recu"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">URL (optionnel)</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background/70 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                placeholder="https://..."
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
                Numero suspect (obligatoire)
              </span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background/70 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                placeholder="+229XXXXXXXX"
                required
              />
            </label>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
              Captures ecran (optionnel)
            </label>
            <label className="inline-flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-input bg-secondary/20 px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary/35">
              <UploadCloud className="h-4 w-4" />
              Ajouter une ou plusieurs images
              <input type="file" accept="image/*" multiple className="hidden" onChange={onFilesChanged} />
            </label>
            {screenshots.length > 0 && (
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {screenshots.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="truncate">
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={submitVerify}
            disabled={loading || reporting || !canSubmit}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Verifier
          </button>
        </div>
      </section>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {result && (
        <section className="panel space-y-4 p-6 fade-rise-in-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title text-lg">Resultat d'analyse</h2>
            <span className={`text-sm font-semibold ${levelColor}`}>
              {result.risk_level} - Score {result.risk_score}/100
            </span>
          </div>

          {result.recurrence_count > 0 && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-300">
              ⚠ Ce numero a deja ete signale {result.recurrence_count} fois par d'autres utilisateurs.
            </div>
          )}

          <ul className="space-y-1 rounded-xl border border-border/70 bg-secondary/20 p-4 text-sm text-muted-foreground">
            {result.explanation.map((line, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/80" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          {!incident && (
            <button
              onClick={submitReport}
              disabled={reporting || loading}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/12 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
            >
              {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Signaler cet incident
            </button>
          )}

          {incident && (
            <div className="space-y-1 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              <div>
                Incident cree: <span className="font-mono">{incident.alert_uuid}</span>
              </div>
              <div>
                Etat initial: <span className="font-semibold">{incident.status}</span> - Score {incident.risk_score_initial}
              </div>
              <div>OSINT: {incident.queued_for_osint ? 'envoye en file de traitement' : 'cree sans URL crawlable'}</div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
