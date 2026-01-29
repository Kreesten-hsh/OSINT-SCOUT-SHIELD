import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/api/client';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import { Token } from '@/types';

export default function LoginPage() {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Use FormData for OAuth2 spec compliance (FastAPI expects form data)
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const response = await apiClient.post<Token>('/auth/login/access-token', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Mock user role for now as token response might not contain it yet (Phase 1)
            const mockUser = { email, role: 'analyst' as const };

            login(response.data, mockUser);
            navigate('/dashboard');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Authentication failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center p-4">
            <div className="absolute top-4 left-4 flex items-center gap-2 text-blue-500 font-bold tracking-widest text-xl">
                <ShieldCheck className="h-8 w-8" />
                OSINT-SCOUT
            </div>

            <Card className="w-full max-w-md bg-[#131B24] border-[#1E293B] shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-full">
                            <Lock className="h-6 w-6 text-blue-500" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-white">Connexion Command Center</CardTitle>
                    <CardDescription className="text-slate-400">
                        Identifiez-vous pour accéder au portail de surveillance.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-md bg-red-900/20 border border-red-900/50 text-red-200 text-sm">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">Identifiant Agent</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="agent@osint.bj"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-[#0f151b] border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-blue-600"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300">Mot de passe</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-[#0f151b] border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-blue-600"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 transition-all active:scale-[0.98]"
                            disabled={isLoading}
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoading ? 'Authentification en cours...' : 'Accéder au Terminal'}
                        </Button>

                        <div className="text-center text-xs text-slate-500 space-y-2">
                            <p>Accès Sécurisé • Surveillance Active (IP Loggée)</p>
                            <div className="flex justify-center gap-4">
                                <a href="#" className="hover:text-blue-400">Politique de Sécurité</a>
                                <a href="#" className="hover:text-blue-400">Support Technique</a>
                            </div>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
