export type UUID = string;
export type ISOString = string;

// --- AUTH TYPES ---
export interface Token {
    access_token: string;
    token_type: string;
}

export type UserRole = 'ADMIN' | 'ANALYST' | 'SME';

export interface User {
    id: number;
    email: string;
    role: UserRole;
}

export interface LoginResponse extends Token {
    user: User;
}

// --- EVIDENCE TYPES ---
export type EvidenceStatus = 'ACTIVE' | 'SEALED';

export interface Evidence {
    id: number;
    alert_id: number;
    type: string;
    status: EvidenceStatus;
    file_path: string;
    file_hash: string;
    content_text_preview?: string;
    metadata_json?: Record<string, unknown>;
    captured_at?: ISOString;
    sealed_at?: ISOString;
}

// --- ANALYSIS TYPES ---
export interface AnalysisResult {
    id: number;
    alert_id: number;
    categories: unknown[];
    entities: unknown[];
}

// --- ALERT TYPES ---
export type AlertStatus = 'NEW' | 'IN_REVIEW' | 'CONFIRMED' | 'DISMISSED' | 'BLOCKED_SIMULATED';

export interface Alert {
    id: number;
    uuid: UUID;
    url: string;
    source_type: string;
    risk_score: number;
    status: AlertStatus;
    created_at: ISOString;
    updated_at?: ISOString;
    analysis_note?: string;

    // Derived Frontend fields (optional)
    severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

    // Relations
    evidences?: Evidence[];
    analysis_results?: AnalysisResult;
}

export interface CitizenIncidentListItem {
    alert_uuid: UUID;
    phone_number: string;
    channel: 'MOBILE_APP' | 'WEB_PORTAL';
    message_preview: string;
    risk_score: number;
    status: AlertStatus;
    created_at: ISOString;
    attachments_count: number;
    reports_for_phone: number;
}

export interface CitizenIncidentListData {
    items: CitizenIncidentListItem[];
    total: number;
    skip: number;
    limit: number;
}

export interface CitizenIncidentAttachment {
    evidence_id: number;
    file_path: string;
    file_hash: string;
    captured_at?: ISOString;
    type: string;
    preview_endpoint: string;
}

export interface CitizenIncidentStats {
    reports_for_phone: number;
    open_reports_for_phone: number;
    confirmed_reports_for_phone: number;
    blocked_reports_for_phone: number;
}

export interface RelatedCitizenIncident {
    alert_uuid: UUID;
    status: AlertStatus;
    risk_score: number;
    created_at: ISOString;
}

export interface CitizenIncidentDetailData {
    alert_uuid: UUID;
    phone_number: string;
    channel: 'MOBILE_APP' | 'WEB_PORTAL';
    message: string;
    url: string;
    risk_score: number;
    status: AlertStatus;
    analysis_note?: string;
    created_at: ISOString;
    attachments: CitizenIncidentAttachment[];
    stats: CitizenIncidentStats;
    related_incidents: RelatedCitizenIncident[];
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages: number;
}
