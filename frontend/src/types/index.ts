export type UUID = string;
export type ISOString = string;

// --- AUTH TYPES ---
export interface Token {
    access_token: string;
    token_type: string;
}

export type UserRole = 'ADMIN' | 'SME';
export type UserStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'DISABLED';
export type BusinessValidationStatus = UserStatus;

export interface User {
    id: number;
    email: string;
    role: UserRole;
    status: UserStatus;
}

export interface LoginResponse extends Token {
    user: User;
}

export interface PmeRegistrationData {
    business_uuid: UUID;
    email: string;
    official_name: string;
    validation_status: BusinessValidationStatus;
    created_at: ISOString;
}

export interface PmeProfileData {
    business_uuid: UUID;
    user_email: string;
    official_name: string;
    keywords: string[];
    legit_numbers: string[];
    contact_email?: string | null;
    contact_phone?: string | null;
    validation_status: BusinessValidationStatus;
    validated_at?: ISOString | null;
    created_at: ISOString;
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

export interface PmeIncidentListItem {
    incident_uuid: UUID;
    report_uuid: UUID;
    public_reference: string;
    report_status: AlertStatus;
    incident_status: AlertStatus;
    channel: 'MOBILE_APP' | 'WEB_PORTAL';
    message_preview: string;
    risk_score: number;
    suspect_phone_masked: string;
    detection_reason?: string | null;
    created_at: ISOString;
    bundle_ready: boolean;
}

export interface PmeIncidentListData {
    items: PmeIncidentListItem[];
    total: number;
    skip: number;
    limit: number;
}

export interface PmeSignalementListItem {
    report_uuid: UUID;
    legacy_alert_uuid?: UUID | null;
    public_reference: string;
    channel: 'MOBILE_APP' | 'WEB_PORTAL';
    message_preview: string;
    risk_score: number;
    report_status: AlertStatus;
    suspect_phone_masked: string;
    created_at: ISOString;
    attachments_count: number;
    bundles_count: number;
}

export interface PmeSignalementListData {
    items: PmeSignalementListItem[];
    total: number;
    skip: number;
    limit: number;
}

export interface PmeBundleListItem {
    bundle_uuid?: UUID | null;
    report_uuid: UUID;
    legacy_alert_uuid?: UUID | null;
    public_reference: string;
    risk_score: number;
    message_preview: string;
    created_at?: ISOString | null;
    bundle_status: string;
    pdf_available: boolean;
    json_available: boolean;
    zip_available: boolean;
}

export interface PmeBundleListData {
    items: PmeBundleListItem[];
    total: number;
    skip: number;
    limit: number;
}

export interface PmeDashboardData {
    official_name: string;
    validation_status: BusinessValidationStatus;
    total_incidents: number;
    new_incidents: number;
    linked_reports: number;
    bundles_ready: number;
    last_incident_at?: ISOString | null;
    recent_incidents: PmeIncidentListItem[];
}

export interface AdminBusinessListItem {
    business_uuid: UUID;
    user_id: number;
    email: string;
    official_name: string;
    validation_status: BusinessValidationStatus;
    contact_email?: string | null;
    contact_phone?: string | null;
    keywords_count: number;
    legit_numbers_count: number;
    created_at: ISOString;
    validated_at?: ISOString | null;
}

export interface AdminBusinessListData {
    items: AdminBusinessListItem[];
    total: number;
    pending_count: number;
    active_count: number;
    rejected_count: number;
    disabled_count: number;
}

export type TransmissionStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'RETRYING' | 'FAILED' | 'DELIVERED';
export type TransmissionTargetType = 'ANSSI_OCRC' | 'OPERATORS';

export interface AdminDailyCount {
    date: string;
    count: number;
}

export interface AdminCategoryCount {
    category: string;
    count: number;
}

export interface AdminDashboardRecentReportItem {
    report_uuid: UUID;
    legacy_alert_uuid?: UUID | null;
    public_reference: string;
    status: AlertStatus;
    risk_score: number;
    message_preview: string;
    suspect_phone_masked: string;
    created_at: ISOString;
}

export interface AdminDashboardBusinessTargetItem {
    business_uuid: UUID;
    official_name: string;
    incidents_count: number;
    last_incident_at?: ISOString | null;
}

export interface AdminDashboardTopNumberItem {
    suspect_number_uuid: UUID;
    masked_phone: string;
    reports_count: number;
    last_seen?: ISOString | null;
}

export interface AdminDashboardRecentTransmissionItem {
    transmission_uuid: UUID;
    public_reference: string;
    target_type: TransmissionTargetType;
    status: TransmissionStatus;
    created_at: ISOString;
    delivered_at?: ISOString | null;
}

export interface AdminDashboardData {
    total_reports: number;
    daily_reports: number;
    open_reports: number;
    confirmed_reports: number;
    bundles_ready: number;
    active_businesses: number;
    pending_businesses: number;
    transmissions_pending: number;
    transmissions_failed: number;
    transmission_success_rate: number;
    active_campaigns: number;
    reports_by_day: AdminDailyCount[];
    reports_by_category: AdminCategoryCount[];
    reports_by_status: Record<AlertStatus, number>;
    transmissions_by_status: Record<TransmissionStatus, number>;
    recent_reports: AdminDashboardRecentReportItem[];
    top_targeted_businesses: AdminDashboardBusinessTargetItem[];
    top_suspect_numbers: AdminDashboardTopNumberItem[];
    recent_transmissions: AdminDashboardRecentTransmissionItem[];
}

export interface AdminBusinessDetailData {
    business_uuid: UUID;
    email: string;
    official_name: string;
    validation_status: BusinessValidationStatus;
    contact_email?: string | null;
    contact_phone?: string | null;
    keywords: string[];
    legit_numbers: string[];
    created_at: ISOString;
    validated_at?: ISOString | null;
    total_incidents: number;
    linked_reports: number;
    bundles_ready: number;
    last_incident_at?: ISOString | null;
    recent_incidents: PmeIncidentListItem[];
    recent_reports: PmeSignalementListItem[];
}

export interface AdminTransmissionListItem {
    transmission_uuid: UUID;
    bundle_uuid: UUID;
    report_uuid: UUID;
    public_reference: string;
    target_type: TransmissionTargetType;
    target_endpoint?: string | null;
    bundle_status: string;
    status: TransmissionStatus;
    attempts: number;
    ack_reference?: string | null;
    next_retry_at?: ISOString | null;
    last_error?: string | null;
    created_at: ISOString;
    delivered_at?: ISOString | null;
    risk_score: number;
    primary_category?: string | null;
    suspect_phone_masked: string;
}

export interface AdminTransmissionListData {
    items: AdminTransmissionListItem[];
    total: number;
    pending_count: number;
    queued_count: number;
    sent_count: number;
    retrying_count: number;
    failed_count: number;
    delivered_count: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages: number;
}
