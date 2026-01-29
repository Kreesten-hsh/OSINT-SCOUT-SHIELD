import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';

// Create Axios Instance
export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Request Interceptor: Attach Token
apiClient.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `${token.token_type} ${token.access_token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle Errors (401, 403, 500)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const { response } = error;

        // Generic Error Handling logic
        if (response) {
            if (response.status === 401) {
                // Token expired or invalid -> Logout
                console.warn('Unauthorized - Logging out');
                useAuthStore.getState().logout();
                // Optionally redirect to login via window.location if not handled by Router
                // window.location.href = '/login'; 
            }
        }

        return Promise.reject(error); // Propagate error for TanStack Query to catch
    }
);
