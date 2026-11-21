import { jsonResponse, handleOptions, corsHeaders } from '@/lib/utils';

// GET /api/health
export async function GET() {
  return jsonResponse({ status: 'healthy' }, {
    message: 'SOLVIX API is running',
    headers: corsHeaders(),
  });
}

// Handle CORS preflight for /api/health
export async function OPTIONS() {
  return handleOptions();
}
