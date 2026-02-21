import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, UploadCloud } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';

type SignalChannel = 'MOBILE_APP' | 'WEB_PORTAL';
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface VerifySignalData {
  risk_score: number;
  risk_level: RiskLevel;
  explanation: string[];
  should_report: boolean;
  matched_rules: string[];
  categories_detected?: string[];
  recurrence_count: number;
}

interface IncidentReportData {
  alert_uuid: string | null;
  status: 'NEW';
  risk_score_initial: number;
  queued_for_osint: boolean;
}

const VERIFY_ROTATION_MESSAGES = ['Analyse en cours...', 'Verification du numero...', 'Consultation de la base...'];
const BENIN_PHONE_PATTERN = /^0\d{9}$/;
const BENIN_PHONE_ERROR = 'Numero invalide - entrez 10 chiffres (ex: 0169647090)';

function isValidBeninPhone(phone: string): boolean {
  return BENIN_PHONE_PATTERN.test(phone);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [channel] = useState<SignalChannel>(() => detectCitizenChannel());
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [showReportConfirmation, setShowReportConfirmation] = useState(false);
  const [showReportSuccess, setShowReportSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifySignalData | null>(null);
  const [incident, setIncident] = useState<IncidentReportData | null>(null);

  const normalizedPhone = useMemo(() => phone.trim(), [phone]);
  const isPhoneValid = isValidBeninPhone(normalizedPhone);
  const phoneError = phoneTouched && !isPhoneValid ? BENIN_PHONE_ERROR : null;
  const canSubmit = message.trim().length >= 5 && isPhoneValid;

  useEffect(() => {
    if (!isVerifying) {
      setLoadingMessageIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % VERIFY_ROTATION_MESSAGES.length);
    }, 1200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isVerifying]);

  const onFilesChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(event.target.files || []);
    setScreenshots(fileList);
  };

  const submitVerify = async () => {
    if (!canSubmit) {
      setPhoneTouched(true);
      return;
    }

    setError(null);
    setShowReportSuccess(false);
    setShowReportConfirmation(false);
    setIncident(null);
    setIsVerifying(true);
    const requestStartedAt = Date.now();

    try {
      const payload = {
        message: message.trim(),
        url: url.trim() || null,
        phone: phone.trim(),
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
      const elapsed = Date.now() - requestStartedAt;
      if (elapsed < 1500) {
        await sleep(1500 - elapsed);
      }
      setIsVerifying(false);
    }
  };

  const submitReport = async () => {
    if (!result) return;

    setError(null);
    setIsReporting(true);

    try {
      const formData = new FormData();
      formData.append('message', message.trim());
      formData.append('phone', phone.trim());
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
      setShowReportConfirmation(false);
      setShowReportSuccess(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.response?.data?.detail || 'Erreur de signalement');
      } else {
        setError('Erreur de signalement');
      }
    } finally {
      setIsReporting(false);
    }
  };

  const levelColor = result?.risk_level === 'HIGH' ? 'text-red-400' : result?.risk_level === 'MEDIUM' ? 'text-amber-300' : 'text-emerald-300';
  const reportButtonDisabled = !result || isReporting || isVerifying || !!incident;

  return (
    <>
      <section className="panel soft-grid relative overflow-hidden p-6 md:p-8 fade-rise-in">
        <div className="pointer-events-none absolute -right-24 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative z-10 mb-6">
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight md:text-3xl">
            Verification et signalement anti-arnaque
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Analysez un message suspect puis signalez-le si necessaire.</p>
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
                onBlur={() => setPhoneTouched(true)}
                className={`h-11 w-full rounded-xl border bg-background/70 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring ${
                  phoneError ? 'border-destructive/70 focus:ring-destructive/40' : 'border-input'
                }`}
                placeholder="Ex: 0169647090"
                required
              />
              {phoneError && <span className="mt-1 block text-xs text-destructive">{phoneError}</span>}
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
            disabled={isVerifying || isReporting || !canSubmit}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Verifier
          </button>
        </div>

        {isVerifying && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/75 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-card/95 px-6 py-5 text-center shadow-2xl">
              <div className="relative">
                <ShieldAlert className="h-9 w-9 text-primary animate-pulse" />
                <Loader2 className="absolute -bottom-1 -right-1 h-4 w-4 animate-spin text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground" aria-live="polite">
                {VERIFY_ROTATION_MESSAGES[loadingMessageIndex]}
              </p>
            </div>
          </div>
        )}
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

          <button
            onClick={() => setShowReportConfirmation(true)}
            disabled={reportButtonDisabled}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/12 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
          >
            {isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
            {incident ? 'Signalement deja envoye' : 'Signaler cet incident'}
          </button>
        </section>
      )}

      {showReportConfirmation && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="font-display text-xl font-semibold">Confirmer le signalement</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Vous etes sur le point de signaler ce message comme suspect. Votre signalement sera transmis aux autorites competentes.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReportConfirmation(false)}
                disabled={isReporting}
                className="rounded-lg border border-input px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/40 hover:text-foreground disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitReport}
                disabled={isReporting}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmer le signalement
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/25 bg-card p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground">Signalement enregistre</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Merci. Votre signalement a bien ete pris en compte et sera traite par nos equipes.
            </p>
            <button
              type="button"
              onClick={() => setShowReportSuccess(false)}
              className="mt-5 rounded-lg border border-input px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
