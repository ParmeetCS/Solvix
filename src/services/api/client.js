// Centralized API client for SOLVIX frontend.
// Uses the backend base URL from environment variables so no component
// hardcodes a backend address. All requests are JSON and errors are
// normalized into a single shape.
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach auth token when authentication is implemented.
// The token is read from memory/localStorage here; actual issuance is handled
// by the auth module in a later task. This keeps components free of auth logic.
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('solvix_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // localStorage unavailable (e.g. SSR); proceed without token.
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: normalize errors and surface consistent messages.
// Never logs tokens or secrets.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { status, data } = error.response || {};
    const message =
      (data && data.message) ||
      (data && data.error) ||
      (status === 401 ? 'Unauthorized. Please sign in again.' :
       status === 403 ? 'Forbidden. You do not have permission for this action.' :
       status === 404 ? 'The requested resource was not found.' :
       status === 429 ? 'Too many requests. Please try again later.' :
       status >= 500 ? 'Server error. Please try again later.' :
       'An unexpected error occurred.');
    const normalized = new Error(message);
    normalized.status = status;
    normalized.data = data;
    return Promise.reject(normalized);
  }
);

export default apiClient;
