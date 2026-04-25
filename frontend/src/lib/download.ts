import type { AxiosResponse } from 'axios';

import { apiClient } from '@/api/client';

interface DownloadRequestOptions {
    method?: 'GET' | 'POST';
    data?: unknown;
}

function extractFilename(response: AxiosResponse<Blob>, fallback: string): string {
    const header = response.headers['content-disposition'] as string | undefined;
    if (!header) return fallback;
    const match = /filename\*?=(?:UTF-8''|\"?)([^\";]+)/i.exec(header);
    if (!match?.[1]) return fallback;
    try {
        return decodeURIComponent(match[1].replace(/\"/g, '').trim());
    } catch {
        return match[1].replace(/\"/g, '').trim();
    }
}

export async function downloadApiFile(
    path: string,
    fallbackFilename: string,
    options?: DownloadRequestOptions,
): Promise<void> {
    const response = await apiClient.request<Blob>({
        url: path,
        method: options?.method ?? 'GET',
        data: options?.data,
        responseType: 'blob',
    });
    const filename = extractFilename(response, fallbackFilename);
    const blobUrl = window.URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(blobUrl);
}
