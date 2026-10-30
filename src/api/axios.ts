import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// La API usa Bearer token (no cookies): no se envían credenciales.
const api = axios.create({ baseURL: BASE_URL });

/** Guarda el par de tokens devuelto por login / refresh / change-password. */
export const saveTokens = (accessToken: string, refreshToken?: string) => {
    localStorage.setItem('token', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
};

/** Limpia toda la sesión local. */
export const clearSession = () => {
    ['token', 'refreshToken', 'id', 'role', 'needsPasswordChange', 'auth-storage']
        .forEach((k) => localStorage.removeItem(k));
};

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// --- Renovación automática de sesión ---------------------------------------
// El access token dura poco (30 min). Ante un 401 se intenta UNA renovación con
// el refresh token (compartida por todas las peticiones simultáneas) y se
// reintenta la petición original. Si falla, se cierra la sesión.
let refreshing: Promise<string> | null = null;

const doRefresh = async (): Promise<string> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('sin refresh token');
    // axios "pelado": evita pasar por este mismo interceptor
    const res = await axios.post(`${BASE_URL}/api/auth/refresh-token`, { refreshToken });
    saveTokens(res.data.accessToken, res.data.refreshToken);
    return res.data.accessToken as string;
};

const AUTH_URLS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh-token',
    '/api/auth/forgot-password', '/api/auth/reset-password'];

api.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
        const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
        const isAuthCall = AUTH_URLS.some((u) => original?.url?.startsWith(u));

        if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
            original._retry = true;
            try {
                refreshing = refreshing ?? doRefresh().finally(() => { refreshing = null; });
                const newToken = await refreshing;
                original.headers.Authorization = `Bearer ${newToken}`;
                return api(original);
            } catch {
                clearSession();
                if (window.location.pathname !== '/login') window.location.href = '/login';
            }
        }

        // El servidor exige cambiar la clave temporal antes de usar el resto de la API
        const data = error.response?.data as { error?: string } | undefined;
        if (error.response?.status === 403 && data?.error === 'PASSWORD_CHANGE_REQUIRED') {
            localStorage.setItem('needsPasswordChange', 'true');
            if (window.location.pathname !== '/profile') window.location.href = '/profile?forcePasswordChange=true';
        }
        return Promise.reject(error);
    },
);

export const getImageUrl = (imageName: string) => {
    if (!imageName) return '/default-avatar.png';
    if (imageName.startsWith('http')) return imageName;
    return `${BASE_URL}/uploads/${imageName}`;
};

export default api;
