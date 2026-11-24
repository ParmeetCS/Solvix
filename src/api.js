// Small frontend integration point for SOLVIX pages.
// No backend responses are faked here; outcomes are surfaced from the actual fetch.
//
// In development the Vite proxy forwards '/api/...' to the backend. When the backend is hosted
// on another origin, VITE_API_BASE_URL (e.g. https://api.example.com/api/v1) points to it, so
// the backend root is that value without the trailing '/api/v1'.
const CONFIGURED = import.meta.env.VITE_API_BASE_URL;
const ROOT_URL = (CONFIGURED || '').replace(/\/$/, '').replace(/\/api\/v1$/, '');

export async function postJson(path, body) {
  const res = await fetch(`${ROOT_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}
