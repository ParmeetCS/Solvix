import { jsonResponse, handleOptions, corsHeaders } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';

export async function GET() {
  return jsonResponse({ name: 'SOLVIX Auth API', version: '1.0.0' }, {
    message: 'SOLVIX Auth v1',
    headers: corsHeaders(),
  });
}

// Handle CORS preflight for /api/auth/*
export async function OPTIONS() {
  return handleOptions();
}

// POST /api/auth/logout
export async function POST(request) {
  try {
    const adminSupa = createAdminClient();
    const { error } = await adminSupa.auth.signOut();

    if (error) {
      return jsonError('Logout failed: ' + error.message, 400);
    }

    return jsonResponse({ message: 'Logged out successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}