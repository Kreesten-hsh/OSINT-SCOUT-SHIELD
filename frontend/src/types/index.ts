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
export interface Evidence {
    id: number;
    alert_id: number;
    filename: string; // Changed from file_path based on backend convention usually
    file_hash: string;
    metadata: Record<string, any>; // Flexible metadata
    created_at: ISOString;
}

// --- ANALYSIS TYPES ---
export interface AnalysisResult {
    id: number;
    alert_id: number;
    categories: Record<string, number>; // e.g. {"phishing": 0.95}
    entities: string[];
    sentiment_score?: number;
}

// --- ALERT TYPES ---
export type AlertStatus = 'NEW' | 'INVESTIGATING' | 'Confirmed' | 'False Positive' | 'CLOSED';
// Note: Backend might send mixed case, frontend should normalize or handle. 
// Assuming Standard: NEW, INVESTIGATING, CLOSED, FALSE_POSITIVE

export interface Alert {
    id: number;
    uuid: UUID;
    title?: string;
    url: string;
    source_type: string;
    risk_score: number;
    status: string; // Relaxed for now, will strictly type if enum known
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    created_at: ISOString;
    updated_at?: ISOString;

    // Relations
    evidence?: Evidence[]; // Array likely based on backend
    analysis?: AnalysisResult;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages: number;
}
