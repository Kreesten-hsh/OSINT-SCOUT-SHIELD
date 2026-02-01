import { apiClient as api } from '@/api/client';

export interface MonitoringSource {
    id: number;
    uuid: string;
    name: string;
    url: string;
    source_type: 'WEB' | 'SOCIAL' | 'MARKETPLACE' | 'SEARCH_ENGINE';
    frequency_minutes: number;
    is_active: boolean;
    last_run_at: string | null;
    last_status: 'NEVER_RUN' | 'CLEAN' | 'ALERT' | 'ERROR' | 'PENDING' | string;
    next_run_at: string | null;
    created_at: string;
}

export interface MonitoringSourceCreate {
    name: string;
    url: string;
    source_type: string;
    frequency_minutes: number;
    is_active?: boolean;
}

export interface ScrapingRun {
    uuid: string;
    status: string;
    alerts_generated_count: number;
    started_at: string;
    completed_at: string | null;
    log_message: string | null;
}

export const monitoringService = {
    getAll: async () => {
        const response = await api.get<MonitoringSource[]>('/scraping/sources');
        return response.data;
    },

    create: async (data: MonitoringSourceCreate) => {
        const response = await api.post<MonitoringSource>('/scraping/sources', data);
        return response.data;
    },

    toggle: async (id: number) => {
        const response = await api.patch<MonitoringSource>(`/scraping/sources/${id}/toggle`);
        return response.data;
    },

    delete: async (id: number) => {
        const response = await api.delete<MonitoringSource>(`/scraping/sources/${id}`);
        return response.data;
    },

    update: async (id: number, data: Partial<MonitoringSourceCreate>) => {
        const response = await api.patch<MonitoringSource>(`/scraping/sources/${id}`, data);
        return response.data;
    },

    getRuns: async (id: number) => {
        const response = await api.get<ScrapingRun[]>(`/scraping/sources/${id}/runs`);
        return response.data;
    },
};
