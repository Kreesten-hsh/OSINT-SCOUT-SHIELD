export interface Evidence {
    id: number;
    alert_id: number;
    file_path: string;
    file_hash: string;
    content_text_preview: string | null;
    captured_at: string | null;
    metadata_json: Record<string, any> | null;
}

export interface AnalysisResult {
    id: number;
    alert_id: number;
    categories: Array<{ name: string; score: number }>;
    entities: Array<[string, string]>; // [Label, Text]
}

export interface Alert {
    id: number;
    uuid: string;
    url: string;
    source_type: string;
    risk_score: number;
    status: "NEW" | "INVESTIGATING" | "CLOSED" | "FALSE_POSITIVE";
    is_confirmed: boolean;
    created_at: string;
    updated_at: string | null;
    evidence?: Evidence;
    analysis_results?: AnalysisResult;
}

export type AlertUpdatePayload = {
    status?: string;
    is_confirmed?: boolean;
};
