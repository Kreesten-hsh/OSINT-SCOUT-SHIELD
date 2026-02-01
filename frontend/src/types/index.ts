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
    // Add other user fields as returned by the backend if any, otherwise keep minimal
}

// --- EVIDENCE TYPES ---
export type EvidenceStatus = 'ACTIVE' | 'SEALED';

export interface Evidence {
    id: number;
    alert_id: number;
    type: string; // SCREENSHOT, HTML, etc.
    status: EvidenceStatus;
    file_path: string;
    file_hash: string;
    content_text_preview?: string;
    metadata_json?: Record<string, any>;
    captured_at?: ISOString;
    sealed_at?: ISOString;
}

// --- ANALYSIS TYPES ---
export interface AnalysisResult {
    id: number;
    alert_id: number;
    categories: any[];
    entities: any[];
}

// --- ALERT TYPES ---
export type AlertStatus = 'NEW' | 'INVESTIGATING' | 'CLOSED' | 'FALSE_POSITIVE';

export interface Alert {
    id: number;
    uuid: UUID;
    url: string;
    source_type: string;
    risk_score: number;
    status: string;
    is_confirmed: boolean;
    created_at: ISOString;
    updated_at?: ISOString;

    // Derived Frontend fields (optional)
    severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

    // Relations
    evidences?: Evidence[];
    analysis_results?: AnalysisResult;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages: number;
}
