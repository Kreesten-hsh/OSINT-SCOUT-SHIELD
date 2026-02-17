import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';

import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth-store';
import type { Token } from '@/types';

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
            const response = await apiClient.post<Token>('/auth/login', { username: email, password });
            const token = response.data;
            const mockUser = { email, role: 'analyst' as const };
            login(token, mockUser);
            navigate('/dashboard');
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(
                    err.response?.data?.message ||
                        err.response?.data?.detail ||
                        'Echec de la connexion. Verifiez vos identifiants.'
                );
            } else {
                setError('Echec de la connexion. Verifiez vos identifiants.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background text-foreground">
            <div className="absolute top-0 left-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />

            <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-2xl backdrop-blur-sm">
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-4 rounded-full bg-primary/20 p-3">
                        <ShieldCheck className="h-10 w-10 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">OSINT-SCOUT</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Acces Dashboard SOC (Analyste/Admin)</p>
                </div>

                {error && (
                    <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Email Professionnel</label>
                        <div className="relative">
                            <Mail className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-input bg-secondary/50 py-2.5 pr-4 pl-10 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-transparent focus:ring-2 focus:ring-ring"
                                placeholder="analyst@osint-scout.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-input bg-secondary/50 py-2.5 pr-4 pl-10 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-transparent focus:ring-2 focus:ring-ring"
                                placeholder="********"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Connexion...
                            </>
                        ) : (
                            'Se connecter'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-muted-foreground">
                    <p>Acces reserve au personnel autorise.</p>
                    <p>Toute tentative d'intrusion sera enregistree.</p>
                </div>
            </div>
        </div>
    );
}
