import { useMemo, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, Upload } from 'lucide-react';

import { apiClient } from '@/api/client';

type SignalChannel = 'MOBILE_APP' | 'WEB_PORTAL';
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface VerifySignalData {
  risk_score: number;
  risk_level: RiskLevel;
  explanation: string[];
  should_report: boolean;
  matched_rules: string[];
}

interface IncidentReportData {
  alert_uuid: string;
  status: 'NEW';
  risk_score_initial: number;
  queued_for_osint: boolean;
}

interface APIResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
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

function channelLabel(channel: SignalChannel): string {
  return channel === 'MOBILE_APP' ? 'Application mobile (PWA)' : 'Interface web';
}

export default function VerifyPage() {
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
        })
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
    result?.risk_level === 'HIGH'
      ? 'text-red-500'
      : result?.risk_level === 'MEDIUM'
      ? 'text-amber-500'
      : 'text-emerald-500';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:py-12">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Verification et signalement citoyen</h1>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            Verifiez un message suspect puis soumettez un signalement complet (numero obligatoire + captures).
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Message suspect</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Collez ici le texte recu..."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Lien (optionnel)</label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Numero suspect (obligatoire)</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="+229XXXXXXXX"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Captures d'ecran (optionnel, images)</label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input bg-secondary/10 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/20">
                <Upload className="h-4 w-4" />
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

            <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm text-muted-foreground">
              Canal detecte automatiquement: <span className="font-medium text-foreground">{channelLabel(channel)}</span>
            </div>

            <button
              onClick={submitVerify}
              disabled={loading || reporting || !canSubmit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Verifier
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>
        )}

        {result && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Resultat d'analyse</h2>
              <span className={`text-sm font-semibold ${levelColor}`}>
                {result.risk_level} - Score {result.risk_score}/100
              </span>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Explications:</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {result.explanation.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </div>

            {!incident && (
              <button
                onClick={submitReport}
                disabled={reporting || loading}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-500 transition hover:bg-amber-500/20 disabled:opacity-50"
              >
                {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                Signaler cet incident
              </button>
            )}

            {incident && (
              <div className="space-y-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
                <div>
                  Incident cree avec succes: <span className="font-mono">{incident.alert_uuid}</span>
                </div>
                <div>
                  Etat initial: <span className="font-semibold">{incident.status}</span> - Score: {incident.risk_score_initial}
                </div>
                <div>
                  OSINT: {incident.queued_for_osint ? 'envoye en file de traitement' : 'cree sans URL crawlable'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
