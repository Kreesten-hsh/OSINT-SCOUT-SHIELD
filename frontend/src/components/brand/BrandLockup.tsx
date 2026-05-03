import { cn } from '@/lib/utils';

interface BrandLockupProps {
  subtitle?: string;
  compact?: boolean;
  centered?: boolean;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  markClassName?: string;
}

export function BrandLockup({
  subtitle,
  compact = false,
  centered = false,
  className,
  titleClassName,
  subtitleClassName,
  markClassName,
}: BrandLockupProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        centered && 'justify-center text-center',
        compact && 'gap-2.5',
        className,
      )}
    >
      <div
        className={cn(
          'brand-mark-frame rounded-2xl p-1.5',
          compact ? 'h-11 w-11' : 'h-14 w-14',
          markClassName,
        )}
      >
        <img
          src="/logo-bcs.png"
          alt="BENIN CYBER SHIELD"
          className="h-full w-full rounded-[0.9rem] object-cover"
        />
      </div>

      <div className={cn('min-w-0', centered && 'items-center')}>
        <p
          className={cn(
            'font-display text-sm font-semibold uppercase tracking-[0.16em] text-primary/95',
            compact ? 'text-[12px]' : 'text-sm',
            titleClassName,
          )}
        >
          BENIN CYBER SHIELD
        </p>
        {subtitle ? (
          <p
            className={cn(
              'mt-1 text-xs text-muted-foreground',
              compact && 'mt-0.5 text-[11px]',
              subtitleClassName,
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
