// Centralized API client for SOLVIX frontend.
//
// Requests go to the same origin ('/api/...') and the Vite dev server proxies
// them to the Next.js backend, so there is no cross-origin traffic in
// development. Set VITE_API_BASE_URL only when the backend is hosted elsewhere
// (the backend then needs FRONTEND_ORIGIN configured for CORS).
import axios from 'axios';
import { session } from '@/lib/session';

const CONFIGURED = import.meta.env.VITE_API_BASE_URL;
const BASE_URL = (CONFIGURED || '/api/v1').replace(/\/$/, '');
const ROOT_URL = BASE_URL.replace(/\/api\/v1$/, '');

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Plain client without interceptors, used only for token refresh.
const bare = axios.create({ baseURL: ROOT_URL, headers: { 'Content-Type': 'application/json' } });

apiClient.interceptors.request.use((config) => {
  // '/api/auth/...' lives at the backend root, not under /api/v1.
  if (config.url && config.url.startsWith('/api/')) {
    config.baseURL = ROOT_URL;
  }
  const token = session.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

async function refreshAccessToken() {
  const refresh_token = session.getRefreshToken();
  if (!refresh_token) throw new Error('No refresh token');
  if (!refreshing) {
    refreshing = bare
      .post('/api/auth/refresh', { refresh_token })
      .then((res) => {
        const data = res.data?.data || {};
        if (!data.token) throw new Error('Refresh failed');
        session.save({ token: data.token, refresh_token: data.refresh_token });
        return data.token;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

function normalize(error) {
  const { status, data } = error.response || {};
  const message =
    (data && (data.message || data.error)) ||
    (!error.response
      ? 'Cannot reach the SOLVIX server. Make sure the backend is running on port 3001.'
      : status === 401 ? 'Your session has expired. Please sign in again.'
      : status === 403 ? 'You do not have permission for this action.'
      : status === 404 ? 'The requested resource was not found.'
      : status === 429 ? 'Too many requests. Please try again later.'
      : status >= 500 ? 'Server error. Please try again later.'
      : 'An unexpected error occurred.');
  const normalized = new Error(message);
  normalized.status = status;
  normalized.data = data;
  return normalized;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.startsWith('/api/auth/login') || original?.url?.startsWith('/api/auth/refresh');

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall && session.getRefreshToken()) {
      original._retried = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      } catch {
        // fall through to forced sign-out
      }
    }

    if (error.response?.status === 401 && !isAuthCall) {
      // Session is no longer valid: tell the app to sign the user out.
      window.dispatchEvent(new CustomEvent('solvix:session-expired'));
    }
    return Promise.reject(normalize(error));
  },
);

export default apiClient;
