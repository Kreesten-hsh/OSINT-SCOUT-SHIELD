import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BellRing, CheckCircle2, KeyRound, Loader2, RadioTower, Settings2, ShieldCheck } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import PageHero from '@/components/layout/PageHero';
import { useAuthStore } from '@/store/auth-store';

const CONSOLE_NOTIFICATIONS_KEY = 'admin.notifications.transmissions_failed';
const REVIEW_NOTIFICATIONS_KEY = 'admin.notifications.pme_pending_review';

interface ChangePasswordResponse {
  updated: boolean;
}

function readStoredPreference(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const rawValue = window.localStorage.getItem(key);
  if (rawValue === null) {
    return fallback;
  }
  return rawValue === 'true';
}

export default function AdminSettingsPage() {
  const user = useAuthStore((state) => state.user);

  const [transmissionNotifications, setTransmissionNotifications] = useState<boolean>(() =>
    readStoredPreference(CONSOLE_NOTIFICATIONS_KEY, true),
  );
  const [reviewNotifications, setReviewNotifications] = useState<boolean>(() =>
    readStoredPreference(REVIEW_NOTIFICATIONS_KEY, true),
  );
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const appVersion = useMemo(() => import.meta.env.VITE_APP_VERSION || '0.0.0', []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CONSOLE_NOTIFICATIONS_KEY, String(transmissionNotifications));
  }, [transmissionNotifications]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(REVIEW_NOTIFICATIONS_KEY, String(reviewNotifications));
  }, [reviewNotifications]);

  const submitPasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmation du nouveau mot de passe ne correspond pas.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const response = await apiClient.post<APIResponse<ChangePasswordResponse>>('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (!response.data.success) {
        setPasswordError(response.data.message || 'Mise a jour impossible.');
        return;
      }

      setPasswordSuccess('Mot de passe modifie avec succes.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setPasswordError(error.response?.data?.message || error.response?.data?.detail || 'Mise a jour impossible.');
      } else {
        setPasswordError('Mise a jour impossible.');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHero
        title="Parametres"
        subtitle="Reglages de la console nationale, preferences operateur et securite du compte administrateur."
        eyebrow={<p className="text-xs uppercase tracking-[0.18em] text-primary/85">Console administrateur</p>}
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr] fade-rise-in-1">
        <article className="panel p-5">
          <h3 className="inline-flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" /> Compte administrateur
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="mt-2 text-sm font-semibold">{user?.email || 'Compte non disponible'}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
              <p className="mt-2 text-sm font-semibold">{user?.role || 'ADMIN'}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border/70 bg-secondary/15 p-4">
            <h4 className="inline-flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="h-4 w-4 text-primary" /> Changer le mot de passe
            </h4>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Mot de passe actuel"
                className="h-11 rounded-xl border border-input bg-background/80 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Nouveau mot de passe"
                className="h-11 rounded-xl border border-input bg-background/80 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirmer"
                className="h-11 rounded-xl border border-input bg-background/80 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
            </div>

            {passwordError && <p className="mt-3 text-sm text-destructive">{passwordError}</p>}
            {passwordSuccess && (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> {passwordSuccess}
              </p>
            )}

            <button
              type="button"
              onClick={submitPasswordChange}
              disabled={isUpdatingPassword}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {isUpdatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Mettre a jour
            </button>
          </div>
        </article>

        <article className="panel p-5">
          <h3 className="inline-flex items-center gap-2 text-lg font-semibold">
            <Settings2 className="h-5 w-5 text-primary" /> Regles automatiques
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Seuil par numero</p>
              <p className="mt-2 text-3xl font-semibold">3</p>
              <p className="mt-2 text-xs text-muted-foreground">Signalements distincts avant transmission.</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Fenetre campagne</p>
              <p className="mt-2 text-3xl font-semibold">2h</p>
              <p className="mt-2 text-xs text-muted-foreground">5 signalements similaires sur la meme fenetre.</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Retries externes</p>
              <p className="mt-2 text-3xl font-semibold">3</p>
              <p className="mt-2 text-xs text-muted-foreground">Tentatives automatiques avant echec final.</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cibles</p>
              <p className="mt-2 text-lg font-semibold">ANSSI/OCRC + Operateurs</p>
              <p className="mt-2 text-xs text-muted-foreground">Connecteurs simules mais directement branchables.</p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr] fade-rise-in-2">
        <article className="panel p-5">
          <h3 className="inline-flex items-center gap-2 text-lg font-semibold">
            <BellRing className="h-5 w-5 text-primary" /> Notifications console
          </h3>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/45 p-4">
              <div>
                <p className="text-sm font-semibold">Notifier les echecs de transmission</p>
                <p className="text-xs text-muted-foreground">Remontee locale pour les dossiers non livres.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={transmissionNotifications}
                onClick={() => setTransmissionNotifications((prev) => !prev)}
                className={`inline-flex min-h-[36px] w-24 items-center justify-center rounded-full border text-xs font-semibold transition ${
                  transmissionNotifications
                    ? 'border-emerald-500/45 bg-emerald-500/20 text-emerald-300'
                    : 'border-border/70 bg-background/60 text-muted-foreground'
                }`}
              >
                {transmissionNotifications ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/45 p-4">
              <div>
                <p className="text-sm font-semibold">Notifier les PME en attente</p>
                <p className="text-xs text-muted-foreground">Rappel local pour le traitement des validations.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={reviewNotifications}
                onClick={() => setReviewNotifications((prev) => !prev)}
                className={`inline-flex min-h-[36px] w-24 items-center justify-center rounded-full border text-xs font-semibold transition ${
                  reviewNotifications
                    ? 'border-emerald-500/45 bg-emerald-500/20 text-emerald-300'
                    : 'border-border/70 bg-background/60 text-muted-foreground'
                }`}
              >
                {reviewNotifications ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </article>

        <article className="panel p-5">
          <h3 className="inline-flex items-center gap-2 text-lg font-semibold">
            <RadioTower className="h-5 w-5 text-primary" /> Connecteurs externes
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">ANSSI/OCRC</p>
              <p className="mt-2 text-sm font-semibold">Endpoint simule actif</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Reception des dossiers critiques, accusés de reception et retries controles.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Operateurs mobiles</p>
              <p className="mt-2 text-sm font-semibold">Renseignement agrege</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Transmission des numeros signales, categories detectees et frequence des campagnes.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Version du systeme</p>
            <p className="mt-2">BENIN CYBER SHIELD {appVersion}</p>
            <p className="mt-2">Prototype academique aligne sur le flux citoyen → PME → dossier forensique → transmission.</p>
          </div>
        </article>
      </section>
    </div>
  );
}
