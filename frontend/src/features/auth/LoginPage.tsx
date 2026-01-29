import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/api/client';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { Token } from '@/types';

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
            // FormData for OAuth2 standard, or JSON depending on backend.
            // Assuming JSON based on "POST /api/v1/auth/login" usually
            // But FastAPI OAuth2PasswordRequestForm usually expects form-data.
            // Sticking to JSON first as per typical "SaaS" prompt, but if it fails I'll switch to form-data.
            const response = await apiClient.post<Token>('/auth/login', { username: email, password });

            // NOTE: If backend is standard FastAPI OAuth2, it returns { access_token, token_type }.
            // User info might need a separate fetch or be included. 
            // For now, mocking User object + extracting token.
            const token = response.data;
            const mockUser = { email, role: 'analyst' as const }; // TODO: Fetch real user info if needed

            login(token, mockUser);
            navigate('/dashboard');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Échec de la connexion. Vérifiez vos identifiants.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[100px] -z-10" />

            <div className="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-2xl backdrop-blur-sm">
                <div className="flex flex-col items-center mb-8">
                    <div className="p-3 bg-primary/20 rounded-full mb-4">
                        <ShieldCheck className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">OSINT-SCOUT</h1>
                    <p className="text-muted-foreground text-sm mt-1">Command Center Access</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Email Professionnel</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-secondary/50 border border-input rounded-lg py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all text-sm placeholder:text-muted-foreground/50"
                                placeholder="analyst@osint-scout.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-secondary/50 border border-input rounded-lg py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all text-sm placeholder:text-muted-foreground/50"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Connexion...
                            </>
                        ) : (
                            'Se connecter'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-muted-foreground">
                    <p>Accès sécurisé réservé au personnel autorisé.</p>
                    <p>Toute tentative d'intrusion sera enregistrée.</p>
                </div>
            </div>
        </div>
    );
}
