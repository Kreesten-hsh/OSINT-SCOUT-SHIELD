import type { ReactNode } from 'react';

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
  otp_request: '🔴 Demande de code secret — aucun service officiel ne demande votre OTP',
  urgency: '🟠 Urgence artificielle — technique pour vous empêcher de réfléchir',
  operator_impersonation: '🔴 Usurpation d’opérateur — MTN/Moov ne demandent jamais ça par SMS',
  unexpected_gain: '🟡 Gain inattendu — aucun gain légitime n’exige un paiement préalable',
  threat_of_loss: '🔴 Menace de perte — fausse urgence pour vous faire agir sans vérifier',
  suspicious_url: '🔴 URL suspecte — ne cliquez pas, tapez l’adresse officielle',
  phone_number_in_message: '🟠 Numéro suspect — ne rappelez pas ce numéro',
};

const COLOR_CLASSES: Record<string, string> = {
  red: 'rounded border-b-2 border-red-500 bg-red-100 px-1 font-semibold text-red-950 cursor-help dark:bg-red-900/60 dark:text-red-100',
  orange:
    'rounded border-b-2 border-orange-500 bg-orange-100 px-1 font-semibold text-orange-950 cursor-help dark:bg-orange-900/60 dark:text-orange-100',
  amber:
    'rounded border-b-2 border-amber-500 bg-amber-100 px-1 font-semibold text-amber-950 cursor-help dark:bg-amber-900/60 dark:text-amber-100',
};

export default function HighlightedMessage({ text, spans }: Props) {
  if (!spans || spans.length === 0) {
    return <p className="whitespace-pre-wrap break-words text-sm font-medium leading-7 text-foreground">{text}</p>;
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
      <mark key={`mark-${index}-${span.start}-${span.end}`} className={cssClass} title={tooltip}>
        {text.slice(span.start, span.end)}
      </mark>,
    );
    cursor = span.end;
  });

  if (cursor < text.length) {
    segments.push(<span key={`plain-tail-${cursor}`}>{text.slice(cursor)}</span>);
  }

  return <p className="whitespace-pre-wrap break-words text-sm font-medium leading-7 text-foreground">{segments}</p>;
}
