import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileImage,
  Link2,
  Loader2,
  MessageSquareText,
  Phone,
  Volume2,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import HighlightedMessage from '@/features/verify/HighlightedMessage';
import { BENIN_DEPARTMENTS } from '@/lib/benin';
import { normalizeRiskLevel } from '@/lib/presentation';
import { cn } from '@/lib/utils';

type SignalChannel = 'MOBILE_APP' | 'WEB_PORTAL';
type RiskLevel = 'FAIBLE' | 'MOYEN' | 'FORT';

interface VerifySignalData {
  risk_score: number;
  risk_level: RiskLevel;
  explanation: string[];
  should_report: boolean;
  matched_rules: string[];
  categories_detected?: string[];
  recurrence_count: number;
  highlighted_spans?: Array<{
    start: number;
    end: number;
    rule: string;
    label: string;
    color: string;
  }>;
  recommendations?: string[];
  citizen_advice?: string[];
  fon_alert?: string | null;
  resolved_department?: string | null;
  department_source?: 'USER_SELECTED' | 'PHONE_DERIVED' | 'UNKNOWN';
}

interface IncidentReportData {
  alert_uuid: string | null;
  status: 'NEW';
  risk_score_initial: number;
  queued_for_osint: boolean;
  report_uuid?: string | null;
  public_reference?: string | null;
}

const VERIFY_ROTATION_MESSAGES = ['Lecture du message', 'Verification du numero', 'Croisement avec les signaux BCS'];
const VERIFY_STEPS = ['Message', 'Numero', 'Regles', 'Conseils'];
const BENIN_PHONE_PATTERN = /^0\d{9}$/;
const BENIN_PHONE_ERROR = 'Numero invalide - entrez 10 chiffres (ex: 0169647090)';

const RISK_PRESENTATION: Record<
  RiskLevel,
  {
    label: string;
    textClass: string;
    badgeClass: string;
    panelClass: string;
    scoreColor: string;
  }
> = {
  FAIBLE: {
    label: 'Risque faible',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    badgeClass: 'border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    panelClass: 'border-emerald-600/20 bg-emerald-500/10',
    scoreColor: '#10b981',
  },
  MOYEN: {
    label: 'Risque moyen',
    textClass: 'text-amber-700 dark:text-amber-300',
    badgeClass: 'border-amber-600/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    panelClass: 'border-amber-600/20 bg-amber-500/10',
    scoreColor: '#f59e0b',
  },
  FORT: {
    label: 'Risque fort',
    textClass: 'text-red-700 dark:text-red-300',
    badgeClass: 'border-red-600/25 bg-red-500/10 text-red-700 dark:text-red-300',
    panelClass: 'border-red-600/20 bg-red-500/10',
    scoreColor: '#ef4444',
  },
};

function getVerifyErrorMessage(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return 'Erreur de verification';
  }

  const responseData = err.response?.data as { message?: string; detail?: string; error?: string } | undefined;
  const backendMessage = responseData?.message || responseData?.detail || responseData?.error;
  if (backendMessage?.trim()) {
    return backendMessage;
  }

  if (!err.response) {
    return 'API de verification inaccessible. Verifiez que le backend repond.';
  }

  if (err.response.status >= 500) {
    return 'Erreur interne du backend pendant la verification.';
  }

  if (err.response.status === 422) {
    return 'Donnees de verification invalides. Verifiez le numero et le formulaire.';
  }

  return 'Erreur de verification';
}

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
  const [department, setDepartment] = useState('');
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
  const messageLength = message.trim().length;
  const hasUrl = url.trim().length > 0;
  const attachedFilesLabel = screenshots.length > 0 ? `${screenshots.length} fichier(s) pret(s)` : 'Aucune capture ajoutee';
  const [isSpeakingFon, setIsSpeakingFon] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const prefilledMessage = searchParams.get('message')?.trim() ?? '';
    const prefilledPhone = searchParams.get('phone')?.trim() ?? '';
    const prefilledDepartment = searchParams.get('department')?.trim() ?? '';
    const prefilledUrl = searchParams.get('url')?.trim() ?? '';

    if (prefilledMessage) {
      setMessage((current) => (current.trim().length > 0 ? current : prefilledMessage));
    }
    if (prefilledPhone) {
      setPhone((current) => (current.trim().length > 0 ? current : prefilledPhone));
      setPhoneTouched(true);
    }
    if (prefilledDepartment) {
      setDepartment((current) => (current.trim().length > 0 ? current : prefilledDepartment));
    }
    if (prefilledUrl) {
      setUrl((current) => (current.trim().length > 0 ? current : prefilledUrl));
    }
  }, []);

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

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const buildWhatsAppMessage = (riskLevel: string, targetPhone: string, reportId: string): string => {
    const riskLabel = riskLevel === 'FORT' ? 'DANGER' : 'Suspect';
    const reportSuffix = reportId ? reportId.slice(0, 8) : 'BCS';
    const msg = [
      'Alerte BENIN CYBER SHIELD',
      '',
      `${riskLabel} : Ce numero (${targetPhone}) est signale comme arnaque.`,
      '',
      'Ne communiquez JAMAIS votre code OTP ou PIN.',
      '',
      'Verifiez vous-meme : https://osint-scout-shield.vercel.app/verify',
      `Rapport BCS ${reportSuffix}`,
    ].join('\n');
    return encodeURIComponent(msg);
  };

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
        department: department || null,
      };

      const response = await apiClient.post<APIResponse<VerifySignalData>>('/analysis/verify', payload);
      setResult(response.data.data ?? null);
    } catch (err: unknown) {
      setError(getVerifyErrorMessage(err));
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
      if (department) {
        formData.append('department', department);
      }
      if (url.trim()) {
        formData.append('url', url.trim());
      }

      formData.append(
        'verification',
        JSON.stringify({
          risk_score: result.risk_score,
          risk_level: normalizeRiskLevel(result.risk_level),
          should_report: result.should_report,
          matched_rules: result.matched_rules,
          categories_detected: result.categories_detected ?? [],
        }),
      );

      for (const file of screenshots) {
        formData.append('screenshots', file);
      }

      const response = await apiClient.post<APIResponse<IncidentReportData>>('/signalements/with-media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setIncident(response.data.data ?? null);
      setShowReportConfirmation(false);
      setShowReportSuccess(true);
    } catch (err: unknown) {
      if (!axios.isAxiosError(err) || !err.response) {
        setError('API de signalement inaccessible. Verifiez que le backend repond.');
      } else {
        const responseData = err.response.data as { message?: string; detail?: string; error?: string } | undefined;
        setError(responseData?.message || responseData?.detail || responseData?.error || 'Erreur de signalement');
      }
    } finally {
      setIsReporting(false);
    }
  };

  const speakFonAlert = () => {
    const fonAlert = result?.fon_alert?.trim();
    if (!fonAlert || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(fonAlert);
    utterance.lang = 'fr-BJ';
    utterance.rate = 0.86;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeakingFon(true);
    utterance.onend = () => setIsSpeakingFon(false);
    utterance.onerror = () => setIsSpeakingFon(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopFonAlert = () => {
    window.speechSynthesis?.cancel();
    setIsSpeakingFon(false);
  };

  const reportButtonDisabled = !result || isReporting || isVerifying || !!incident;
  const risk = result ? RISK_PRESENTATION[result.risk_level] : null;
  const adviceItems = result?.citizen_advice?.length ? result.citizen_advice : result?.recommendations ?? [];
  const shouldShowWhatsApp = result?.risk_level === 'FORT' || result?.risk_level === 'MOYEN';

  return (
    <>
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-[0_22px_70px_-56px_rgba(15,23,42,0.72)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Etape 1</p>
              <h2 className="mt-1 font-display text-2xl font-bold leading-tight">Message a analyser</h2>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              <MessageSquareText className="h-3.5 w-3.5 text-primary" />
              {messageLength} caractere(s)
            </div>
          </div>

          <label className="mt-5 block">
            <span className="sr-only">Message suspect</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-[220px] w-full resize-y rounded-2xl border border-input bg-background/70 px-4 py-4 text-base leading-7 text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              placeholder="Collez ici le SMS, le message WhatsApp ou le texte suspect recu."
            />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Canal</p>
              <p className="mt-1 text-sm font-semibold">{channel === 'MOBILE_APP' ? 'Application mobile' : 'Portail web'}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Lien</p>
              <p className="mt-1 text-sm font-semibold">{hasUrl ? 'Analyse OSINT active' : 'Optionnel'}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Preuves</p>
              <p className="mt-1 text-sm font-semibold">{attachedFilesLabel}</p>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-[0_22px_70px_-56px_rgba(15,23,42,0.72)] backdrop-blur-xl sm:p-6">
          <p className="text-xs font-bold uppercase text-muted-foreground">Etape 2</p>
          <h2 className="mt-1 font-display text-2xl font-bold leading-tight">Contexte du signal</h2>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Phone className="h-4 w-4 text-primary" />
                Numero suspect
              </span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                onBlur={() => setPhoneTouched(true)}
                className={cn(
                  'h-12 w-full rounded-2xl border bg-background/70 px-4 text-sm outline-none focus:ring-4',
                  phoneError
                    ? 'border-destructive/70 focus:ring-destructive/10'
                    : 'border-input focus:border-primary/40 focus:ring-primary/10',
                )}
                placeholder="Ex: 0169647090"
                required
              />
              {phoneError && <span className="mt-2 block text-xs font-semibold text-destructive">{phoneError}</span>}
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Link2 className="h-4 w-4 text-primary" />
                URL suspecte
              </span>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="h-12 w-full rounded-2xl border border-input bg-background/70 px-4 text-sm outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                placeholder="https://..."
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Departement</span>
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="h-12 w-full rounded-2xl border border-input bg-background/70 px-4 text-sm outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              >
                <option value="">Detection automatique</option>
                {BENIN_DEPARTMENTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <FileImage className="h-4 w-4 text-primary" />
                Captures ecran
              </p>
              <label className="flex min-h-[56px] cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-input bg-background/50 px-4 py-3 text-sm text-muted-foreground hover:bg-secondary/40">
                <span className="inline-flex items-center gap-2">
                  <UploadCloud className="h-4 w-4" />
                  Ajouter des images
                </span>
                <span className="text-xs font-semibold">{screenshots.length}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={onFilesChanged} />
              </label>
              {screenshots.length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {screenshots.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="truncate rounded-lg bg-secondary/30 px-2 py-1">
                      {file.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={submitVerify}
            disabled={isVerifying || isReporting || !canSubmit}
            className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[0_16px_42px_-30px_rgba(14,165,233,0.8)] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
            Verifier le message
          </button>
        </aside>
      </section>

      {isVerifying && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/72 px-4 backdrop-blur-md">
          <section
            className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-primary/20 bg-card shadow-[0_32px_90px_-46px_rgba(14,165,233,0.7)] fade-rise-in"
            role="status"
            aria-live="polite"
          >
            <div className="relative p-6 sm:p-7">
              <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
              <div className="relative flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <ScanLine className="h-6 w-6 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-primary">Analyse en cours</p>
                  <h2 className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl">
                    {VERIFY_ROTATION_MESSAGES[loadingMessageIndex]}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Le moteur BCS verifie le contenu, le numero et les signaux connus. Ne fermez pas la page.
                  </p>
                </div>
              </div>

              <div className="relative mt-6">
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(92, 28 + loadingMessageIndex * 24)}%` }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {VERIFY_STEPS.map((step, index) => (
                    <span
                      key={step}
                      className={cn(
                        'inline-flex min-h-9 items-center justify-center rounded-xl border px-2 text-center text-xs font-bold',
                        index <= loadingMessageIndex + 1
                          ? 'border-primary/25 bg-primary/10 text-primary'
                          : 'border-border bg-background/70 text-muted-foreground',
                      )}
                    >
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          {error}
        </div>
      )}

      {result && risk && (
        <section className="rounded-3xl border border-border/70 bg-card/90 p-5 shadow-[0_24px_80px_-58px_rgba(15,23,42,0.72)] backdrop-blur-xl fade-rise-in-1 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className={cn('rounded-3xl border p-5', risk.panelClass)}>
              <div
                className="mx-auto grid h-36 w-36 place-items-center rounded-full p-2"
                style={{
                  background: `conic-gradient(${risk.scoreColor} ${Math.max(0, Math.min(result.risk_score, 100)) * 3.6}deg, hsl(var(--secondary)) 0deg)`,
                }}
              >
                <div className="grid h-full w-full place-items-center rounded-full bg-card text-center">
                  <div>
                    <p className="font-display text-4xl font-bold">{result.risk_score}</p>
                    <p className="text-xs font-bold uppercase text-muted-foreground">sur 100</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 text-center">
                <span className={cn('inline-flex rounded-full border px-3 py-1.5 text-xs font-bold uppercase', risk.badgeClass)}>
                  {risk.label}
                </span>
                <p className="mt-3 text-sm text-muted-foreground">
                  {result.should_report ? 'Un signalement formel est recommande.' : 'Restez prudent avant toute action.'}
                </p>
              </div>
            </div>

            <div className="min-w-0 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">Resultat</p>
                  <h2 className="mt-1 font-display text-2xl font-bold leading-tight">Analyse du message</h2>
                </div>
                {result.resolved_department && (
                  <span className="inline-flex w-fit rounded-full border border-emerald-600/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {result.resolved_department}
                  </span>
                )}
              </div>

              {result.recurrence_count > 0 && (
                <div className="rounded-2xl border border-amber-600/25 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Ce numero a deja ete signale {result.recurrence_count} fois.
                </div>
              )}

              <div className="rounded-3xl border border-border/80 bg-background/74 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Message analyse</p>
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', risk.textClass)}>{result.risk_level}</span>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <HighlightedMessage text={message.trim()} spans={result.highlighted_spans ?? []} />
                </div>
              </div>

              {adviceItems.length > 0 && (
                <div className="rounded-3xl border border-border/80 bg-background/60 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    Actions recommandees
                  </p>
                  <ul className="grid gap-2">
                    {adviceItems.map((advice, index) => (
                      <li key={`${advice}-${index}`} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{advice}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.fon_alert && (
                <div className="rounded-3xl border border-sky-600/20 bg-sky-500/10 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-sky-700 dark:text-sky-300">Alerte en fon</p>
                      <p className="mt-2 text-base font-bold leading-7 text-foreground">{result.fon_alert}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Lecture vocale disponible pour les personnes qui comprennent mieux le fon.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={isSpeakingFon ? stopFonAlert : speakFonAlert}
                      className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-2xl border border-sky-600/25 bg-sky-500/10 px-4 text-sm font-bold text-sky-700 hover:bg-sky-500/20 dark:text-sky-300"
                    >
                      <Volume2 className="h-4 w-4" />
                      {isSpeakingFon ? 'Arreter' : 'Lire en fon'}
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-border/80 bg-background/60 p-4">
                <p className="mb-3 text-sm font-bold">Pourquoi ce score ?</p>
                <ul className="space-y-2">
                  {result.explanation.map((line, index) => (
                    <li key={`${line}-${index}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={() => setShowReportConfirmation(true)}
                  disabled={reportButtonDisabled}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-amber-600/30 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-300"
                >
                  {isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                  {incident ? 'Signalement envoye' : 'Signaler cet incident'}
                </button>

                {shouldShowWhatsApp && (
                  <a
                    href={`https://wa.me/?text=${buildWhatsAppMessage(
                      result.risk_level,
                      normalizedPhone,
                      incident?.alert_uuid ?? '',
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-emerald-600/25 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Prevenir mes proches
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {showReportConfirmation && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="font-display text-xl font-bold">Confirmer le signalement</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Ce message sera enregistre avec sa reference publique, ses pieces jointes et les elements utiles a l'analyse.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReportConfirmation(false)}
                disabled={isReporting}
                className="rounded-xl border border-input px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary/40 hover:text-foreground disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitReport}
                disabled={isReporting}
                className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-emerald-600/25 bg-card p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">Signalement enregistre</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Votre signalement est pris en compte et sera traite par les equipes competentes.
            </p>
            <button
              type="button"
              onClick={() => setShowReportSuccess(false)}
              className="mt-5 rounded-xl border border-input px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
