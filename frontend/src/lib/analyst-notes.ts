import type { PlaybookActionType } from '@/lib/presentation';
import { playbookActionLabel } from '@/lib/presentation';

type NoteTag = 'SOC_DECISION' | 'SHIELD_DISPATCH' | 'OPERATOR_CALLBACK' | 'UNKNOWN';
type NoteTone = 'neutral' | 'success' | 'warning';

export interface AnalystNoteEntry {
    id: string;
    tag: NoteTag;
    title: string;
    content: string;
    details: string[];
    tone: NoteTone;
}

function replacePlaybookCodes(input: string): string {
    const actionCodes: PlaybookActionType[] = [
        'BLOCK_NUMBER',
        'SUSPEND_WALLET',
        'ENFORCE_MFA',
        'BLACKLIST_ADD',
        'USER_NOTIFY',
    ];

    let output = input;
    for (const code of actionCodes) {
        output = output.split(code).join(playbookActionLabel(code));
    }
    return output;
}

function resolveTag(rawTag: string): NoteTag {
    if (rawTag === 'SOC_DECISION') return 'SOC_DECISION';
    if (rawTag === 'SHIELD_DISPATCH') return 'SHIELD_DISPATCH';
    if (rawTag === 'OPERATOR_CALLBACK') return 'OPERATOR_CALLBACK';
    return 'UNKNOWN';
}

function titleForTag(tag: NoteTag): string {
    if (tag === 'SOC_DECISION') return 'Decision SOC';
    if (tag === 'SHIELD_DISPATCH') return 'Action SHIELD';
    if (tag === 'OPERATOR_CALLBACK') return 'Retour operateur';
    return 'Note analyste';
}

function toneForTag(tag: NoteTag, content: string): NoteTone {
    if (tag === 'SHIELD_DISPATCH') return 'warning';
    if (tag === 'SOC_DECISION' && content.includes('CONFIRM')) return 'success';
    if (tag === 'OPERATOR_CALLBACK' && content.includes('EXECUTED')) return 'success';
    return 'neutral';
}

export function parseAnalystNotes(rawNotes?: string | null): AnalystNoteEntry[] {
    if (!rawNotes || !rawNotes.trim()) return [];

    return rawNotes
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
            const match = line.match(/^\[([A-Z_]+)\]\s*(.*)$/);
            const rawTag = match?.[1] ?? 'UNKNOWN';
            const contentRaw = match?.[2] ?? line;
            const tag = resolveTag(rawTag);
            const content = replacePlaybookCodes(contentRaw);

            const parts = content
                .split('|')
                .map((p) => p.trim())
                .filter(Boolean);
            const main = parts[0] ?? content;
            const details = parts.slice(1);

            return {
                id: `${tag}-${index}`,
                tag,
                title: titleForTag(tag),
                content: main,
                details,
                tone: toneForTag(tag, content),
            };
        });
}
