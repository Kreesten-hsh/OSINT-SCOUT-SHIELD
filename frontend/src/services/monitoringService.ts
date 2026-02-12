import { apiClient as api } from '@/api/client';
import { APIResponse } from '@/api/types';

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
        const response = await api.get<APIResponse<MonitoringSource[]>>('/sources/');
        return response.data.data || [];
    },

    create: async (data: MonitoringSourceCreate) => {
        const response = await api.post<APIResponse<MonitoringSource>>('/sources/', data);
        return response.data.data;
    },

    toggle: async (id: number) => {
        const response = await api.patch<APIResponse<MonitoringSource>>(`/sources/${id}/toggle`);
        return response.data.data;
    },

    delete: async (id: number) => {
        const response = await api.delete<APIResponse<MonitoringSource>>(`/sources/${id}`);
        return response.data.data;
    },

    update: async (id: number, data: Partial<MonitoringSourceCreate>) => {
        const response = await api.patch<APIResponse<MonitoringSource>>(`/sources/${id}`, data);
        return response.data.data;
    },

    getRuns: async (id: number) => {
        const response = await api.get<APIResponse<ScrapingRun[]>>(`/sources/${id}/runs`);
        return response.data.data || [];
    },
};
