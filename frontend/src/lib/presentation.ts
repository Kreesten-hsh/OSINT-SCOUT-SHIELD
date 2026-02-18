import type { AlertStatus } from '@/types';

export type SignalChannel = 'MOBILE_APP' | 'WEB_PORTAL';
export type PlaybookActionType =
    | 'BLOCK_NUMBER'
    | 'SUSPEND_WALLET'
    | 'ENFORCE_MFA'
    | 'BLACKLIST_ADD'
    | 'USER_NOTIFY';

const PLAYBOOK_ACTION_LABELS: Record<PlaybookActionType, string> = {
    BLOCK_NUMBER: 'Blocage du numero',
    SUSPEND_WALLET: 'Suspension du wallet',
    ENFORCE_MFA: 'Renforcement MFA',
    BLACKLIST_ADD: 'Ajout en liste noire',
    USER_NOTIFY: 'Notification utilisateur',
};

const STATUS_LABELS: Record<AlertStatus, string> = {
    NEW: 'Nouveau',
    IN_REVIEW: 'En revision',
    CONFIRMED: 'Confirme',
    DISMISSED: 'Classe sans suite',
    BLOCKED_SIMULATED: 'Bloque (simule)',
};

export function playbookActionLabel(action: PlaybookActionType): string {
    return PLAYBOOK_ACTION_LABELS[action] ?? action;
}

export function playbookActionEntries(): Array<{ value: PlaybookActionType; label: string }> {
    return (Object.keys(PLAYBOOK_ACTION_LABELS) as PlaybookActionType[]).map((key) => ({
        value: key,
        label: PLAYBOOK_ACTION_LABELS[key],
    }));
}

export function channelLabel(channel: SignalChannel): string {
    return channel === 'MOBILE_APP' ? 'Application mobile' : 'Interface web';
}

export function sourceLabel(sourceType: string): string {
    if (sourceType === 'CITIZEN_MOBILE_APP') return 'Citizen mobile';
    if (sourceType === 'CITIZEN_WEB_PORTAL') return 'Citizen web';
    return sourceType;
}

export function alertStatusLabel(status: AlertStatus): string {
    return STATUS_LABELS[status] ?? status;
}

export function alertStatusVariant(status: AlertStatus): 'default' | 'outline' | 'warning' | 'destructive' | 'success' | 'secondary' {
    if (status === 'BLOCKED_SIMULATED') return 'success';
    if (status === 'CONFIRMED') return 'destructive';
    if (status === 'IN_REVIEW') return 'warning';
    if (status === 'DISMISSED') return 'secondary';
    if (status === 'NEW') return 'outline';
    return 'default';
}

export function riskSeverity(score: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (score >= 90) return 'CRITICAL';
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
}

export function riskTone(score: number): 'text-red-400' | 'text-amber-300' | 'text-emerald-300' {
    if (score >= 80) return 'text-red-400';
    if (score >= 50) return 'text-amber-300';
    return 'text-emerald-300';
}

export function isHttpUrl(value: string): boolean {
    return value.startsWith('http://') || value.startsWith('https://');
}

export function displayTarget(value: string): string {
    if (value.startsWith('citizen://')) return 'Signal textuel (sans URL crawlable)';
    return value;
}

export function safeHostname(value: string): string {
    if (!isHttpUrl(value)) return 'Signal citoyen';
    try {
        return new URL(value).hostname;
    } catch {
        return 'Cible invalide';
    }
}
