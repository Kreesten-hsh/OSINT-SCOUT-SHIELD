import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BellRing, CheckCircle2, Info, KeyRound, Loader2, ShieldCheck, UserCircle2 } from 'lucide-react';

import { apiClient } from '@/api/client';
import type { APIResponse } from '@/api/types';
import { useAuthStore } from '@/store/auth-store';

const EMAIL_ALERT_KEY = 'settings.notifications.email_incident_confirmed';
const RECURRENCE_ALERT_KEY = 'settings.notifications.recurrence_signal';

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

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState<boolean>(() =>
    readStoredPreference(EMAIL_ALERT_KEY, true),
  );
  const [recurrenceNotificationsEnabled, setRecurrenceNotificationsEnabled] = useState<boolean>(() =>
    readStoredPreference(RECURRENCE_ALERT_KEY, true),
  );

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const appVersion = useMemo(() => import.meta.env.VITE_APP_VERSION || '0.0.0', []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(EMAIL_ALERT_KEY, String(emailNotificationsEnabled));
  }, [emailNotificationsEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(RECURRENCE_ALERT_KEY, String(recurrenceNotificationsEnabled));
  }, [recurrenceNotificationsEnabled]);

  const resetPasswordModalState = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    resetPasswordModalState();
  };

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
      <section className="panel p-5 fade-rise-in">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Parametres</h2>
        <p className="text-sm text-muted-foreground">Configuration personnelle et preferences de travail.</p>
      </section>

      <section className="panel p-5 fade-rise-in-1">
        <h3 className="mb-3 inline-flex items-center gap-2 text-lg font-semibold">
          <UserCircle2 className="h-5 w-5 text-primary" /> Mon compte
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
            <p className="mt-1 text-sm font-semibold">{user?.email || 'Compte non disponible'}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
            <p className="mt-1 text-sm font-semibold">{user?.role || 'ANALYST'}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            resetPasswordModalState();
            setShowPasswordModal(true);
          }}
          className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-primary/35 bg-primary/15 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25"
        >
          <KeyRound className="h-4 w-4" /> Changer mon mot de passe
        </button>
      </section>

      <section className="panel p-5 fade-rise-in-2">
        <h3 className="mb-3 inline-flex items-center gap-2 text-lg font-semibold">
          <BellRing className="h-5 w-5 text-primary" /> Notifications
        </h3>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-secondary/20 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">M'alerter par email quand un incident est confirme</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={emailNotificationsEnabled}
              onClick={() => setEmailNotificationsEnabled((prev) => !prev)}
              className={`inline-flex min-h-[36px] w-24 items-center justify-center rounded-full border text-xs font-semibold transition ${
                emailNotificationsEnabled
                  ? 'border-emerald-500/45 bg-emerald-500/20 text-emerald-300'
                  : 'border-border/70 bg-background/60 text-muted-foreground'
              }`}
            >
              {emailNotificationsEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-secondary/20 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">M'alerter quand un numero que j'ai signale est signale a nouveau</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={recurrenceNotificationsEnabled}
              onClick={() => setRecurrenceNotificationsEnabled((prev) => !prev)}
              className={`inline-flex min-h-[36px] w-24 items-center justify-center rounded-full border text-xs font-semibold transition ${
                recurrenceNotificationsEnabled
                  ? 'border-emerald-500/45 bg-emerald-500/20 text-emerald-300'
                  : 'border-border/70 bg-background/60 text-muted-foreground'
              }`}
            >
              {recurrenceNotificationsEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">Fonctionnalite complete disponible prochainement.</p>
      </section>

      <section className="panel p-5 fade-rise-in-3">
        <h3 className="mb-3 inline-flex items-center gap-2 text-lg font-semibold">
          <Info className="h-5 w-5 text-primary" /> A propos du systeme
        </h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Version:</span> {appVersion}
          </p>
          <p>
            <a
              href="https://csirt.gouv.bj"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ShieldCheck className="h-4 w-4" /> bjCSIRT - https://csirt.gouv.bj
            </a>
          </p>
          <p>BENIN CYBER SHIELD - Prototype academique L3 - 2026</p>
        </div>
      </section>

      {showPasswordModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="font-display text-xl font-semibold">Changer mon mot de passe</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Mot de passe actuel</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Nouveau mot de passe</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Confirmer le mot de passe</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>

            {passwordError && <p className="mt-3 text-sm text-destructive">{passwordError}</p>}
            {passwordSuccess && (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> {passwordSuccess}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closePasswordModal}
                className="rounded-lg border border-input px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={submitPasswordChange}
                disabled={isUpdatingPassword}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isUpdatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Mettre a jour
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
