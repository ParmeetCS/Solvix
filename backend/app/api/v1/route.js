import { jsonResponse, handleOptions, corsHeaders } from '@/lib/utils';

// GET /api/v1 — returns API name and version.
export async function GET() {
  return jsonResponse({ name: 'SOLVIX API', version: '1.0.0' }, {
    message: 'SOLVIX API v1',
    headers: corsHeaders(),
  });
}

// Handle CORS preflight for /api/v1
export async function OPTIONS() {
  return handleOptions();
}
