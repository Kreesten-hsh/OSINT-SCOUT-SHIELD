import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';

import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth-store';
import type { LoginResponse } from '@/types';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiClient.post<LoginResponse>('/auth/login', { username: email, password });
            const { access_token, token_type, user } = response.data;
            login({ access_token, token_type }, user);
            navigate(user.role === 'SME' ? '/business/verify' : '/dashboard');
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || err.response?.data?.detail || 'Echec de connexion.');
            } else {
                setError('Echec de connexion.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(13,147,242,0.3),transparent_35%),radial-gradient(circle_at_85%_0%,rgba(16,185,129,0.2),transparent_35%)]" />

            <div className="panel relative z-10 w-full max-w-md p-7 sm:p-8">
                <div className="mb-7 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary">
                        <ShieldCheck className="h-7 w-7" />
                    </div>
                    <h1 className="font-display text-2xl font-bold tracking-tight">BENIN CYBER SHIELD</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Connexion espace analyste SOC</p>
                </div>

                {error && (
                    <div className="mb-5 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <label className="block space-y-1.5 text-sm">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Identifiant</span>
                        <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="admin@osint.com"
                                className="h-11 w-full rounded-xl border border-input bg-background/70 pl-9 pr-3 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </label>

                    <label className="block space-y-1.5 text-sm">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Mot de passe</span>
                        <div className="relative">
                            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="********"
                                className="h-11 w-full rounded-xl border border-input bg-background/70 pl-9 pr-3 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </label>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        {isLoading ? 'Connexion en cours...' : 'Se connecter'}
                    </button>
                </form>

                <p className="mt-5 text-center text-[11px] text-muted-foreground">
                    Console reservee aux analystes autorises. Activite journalisee.
                </p>
            </div>
        </div>
    );
}
