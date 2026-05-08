import { Moon, Sun } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store/theme-store';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export function ThemeToggle({ compact = false, className }: ThemeToggleProps) {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      aria-label={isLight ? 'Passer en mode sombre' : 'Passer en mode clair'}
      aria-pressed={isLight}
      onClick={toggleTheme}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-full border border-input bg-card/80 px-2 text-sm font-semibold text-muted-foreground shadow-sm transition hover:text-foreground',
        compact ? 'w-10 justify-center px-0' : 'pl-3 pr-1.5',
        className,
      )}
    >
      {!compact && <span>{isLight ? 'Clair' : 'Sombre'}</span>}
      <span
        className={cn(
          'grid h-7 w-7 place-items-center rounded-full transition',
          isLight ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
        )}
      >
        {isLight ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
    </button>
  );
}
