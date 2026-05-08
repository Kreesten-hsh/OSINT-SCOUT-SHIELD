import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppTheme = 'dark' | 'light';

interface ThemeState {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),
    }),
    {
      name: 'bcs-theme-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
