import axios from "axios";

// L'URL de l'API est définie dans les variables d'environnement (Vite)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: {
        "Content-Type": "application/json",
    },
});

// Intercepteur pour gérer les erreurs globales (ex: 401, 500)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // TODO: Ajouter un toast de notification d'erreur
        console.error("API Error:", error.response?.data || error.message);
        return Promise.reject(error);
    }
);
