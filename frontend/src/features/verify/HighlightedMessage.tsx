import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface Span {
  start: number;
  end: number;
  rule: string;
  label: string;
  color: string;
}

interface Props {
  text: string;
  spans: Span[];
}

const RULE_TOOLTIPS: Record<string, string> = {
  otp_request: 'Demande de code secret : aucun service officiel ne demande votre OTP.',
  urgency: 'Urgence artificielle : technique pour vous faire agir trop vite.',
  operator_impersonation: 'Usurpation d operateur : un operateur ne demande pas votre PIN par message.',
  unexpected_gain: 'Gain inattendu : un gain legitime ne demande pas de code ou de paiement.',
  threat_of_loss: 'Menace de perte : pression psychologique pour vous faire reagir.',
  suspicious_url: 'URL suspecte : ne cliquez pas, verifiez l adresse officielle.',
  phone_number_in_message: 'Numero suspect : evitez de rappeler sans verification.',
};

const COLOR_CLASSES: Record<string, string> = {
  red: 'border-red-500/70 bg-red-500/10 text-red-950 dark:bg-red-500/20 dark:text-red-100',
  orange: 'border-orange-500/70 bg-orange-500/20 text-orange-950 dark:bg-orange-500/20 dark:text-orange-100',
  amber: 'border-amber-500/70 bg-amber-500/20 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100',
};

export default function HighlightedMessage({ text, spans }: Props) {
  if (!spans || spans.length === 0) {
    return <p className="whitespace-pre-wrap break-words text-base font-semibold leading-8 text-foreground">{text}</p>;
  }

  const sortedSpans = [...spans].sort((a, b) => a.start - b.start);
  const segments: ReactNode[] = [];
  let cursor = 0;

  sortedSpans.forEach((span, index) => {
    if (cursor < span.start) {
      segments.push(<span key={`plain-${index}-${cursor}`}>{text.slice(cursor, span.start)}</span>);
    }

    const cssClass = COLOR_CLASSES[span.color] ?? COLOR_CLASSES.orange;
    const tooltip = RULE_TOOLTIPS[span.rule] ?? span.label;
    segments.push(
      <mark
        key={`mark-${index}-${span.start}-${span.end}`}
        className={cn('rounded-md border px-1.5 py-0.5 font-bold cursor-help', cssClass)}
        title={tooltip}
      >
        {text.slice(span.start, span.end)}
      </mark>,
    );
    cursor = span.end;
  });

  if (cursor < text.length) {
    segments.push(<span key={`plain-tail-${cursor}`}>{text.slice(cursor)}</span>);
  }

  return <p className="whitespace-pre-wrap break-words text-base font-semibold leading-8 text-foreground">{segments}</p>;
}
