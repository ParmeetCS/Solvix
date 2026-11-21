// Named exports for convenience. Individual service modules (leads, quotes,
// inventory, etc.) should import apiClient from this file and add their own
// endpoint functions here or in dedicated files under services/api/.
export { apiClient, default } from './client';
