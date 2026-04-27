import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PageHeroProps {
  title: string;
  subtitle?: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  toolbarClassName?: string;
  tone?: 'default' | 'dark';
}

export default function PageHero({
  title,
  subtitle,
  eyebrow,
  actions,
  children,
  className,
  bodyClassName,
  toolbarClassName,
  tone = 'default',
}: PageHeroProps) {
  return (
    <section className={cn('hero-panel fade-rise-in', tone === 'dark' && 'hero-panel-dark', className)}>
      <div className={cn('flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between', bodyClassName)}>
        <div>
          {eyebrow ? <div className="flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
          <h2 className={cn(eyebrow && 'mt-4', 'text-3xl font-bold tracking-tight')}>{title}</h2>
          {subtitle ? <p className="section-subtitle mt-2 max-w-3xl">{subtitle}</p> : null}
        </div>

        {actions ? <div className="hero-actions xl:justify-end">{actions}</div> : null}
      </div>

      {children ? <div className={cn('hero-toolbar', toolbarClassName)}>{children}</div> : null}
    </section>
  );
}
