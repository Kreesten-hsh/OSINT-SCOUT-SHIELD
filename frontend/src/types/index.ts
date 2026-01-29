export type UUID = string;
export type ISOString = string; // e.g., "2023-01-01T12:00:00Z"

// --- AUTH TYPES ---
export interface Token {
    access_token: string;
    token_type: string;
}

export interface User {
    email: string;
    role: 'admin' | 'analyst';
}

// --- EVIDENCE TYPES ---
export interface Evidence {
    id: number;
    alert_id: number;
    file_path: string;
    file_hash: string;
    content_text_preview?: string | null;
    captured_at?: ISOString | null;
    metadata_json?: Record<string, any> | null;
}

// --- ANALYSIS TYPES ---
export interface AnalysisResult {
    id: number;
    alert_id: number;
    categories: Array<{ name: string; score: number }>;
    entities: Array<any>; // Can be refined based on actual entity structure
}

// --- ALERT TYPES ---
export type AlertStatus = 'NEW' | 'INVESTIGATING' | 'FALSE_POSITIVE' | 'CLOSED';
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Alert {
    id: number;
    uuid: UUID;
    url: string;
    source_type: string;
    risk_score: number;
    status: AlertStatus | string; // Relaxed string for compatibility if backend sends raw strings
    is_confirmed: boolean;
    created_at: ISOString;
    updated_at?: ISOString | null;

    evidence?: Evidence | null;
    analysis_results?: AnalysisResult | null;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages: number;
}
