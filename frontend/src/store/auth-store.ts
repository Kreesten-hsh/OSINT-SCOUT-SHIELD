import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Token, User } from '@/types';

interface AuthState {
    token: Token | null;
    user: User | null;
    isAuthenticated: boolean;

    login: (token: Token, user: User) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isAuthenticated: false,

            login: (token, user) => set({ token, user, isAuthenticated: true }),
            logout: () => set({ token: null, user: null, isAuthenticated: false }),
        }),
        {
            name: 'osint-auth-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
