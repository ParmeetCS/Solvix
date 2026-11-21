import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';

export async function OPTIONS() {
  return handleOptions();
}

/** POST /api/auth/refresh { refresh_token } -> new access + refresh tokens */
export async function POST(request) {
  try {
    const { refresh_token } = await request.json().catch(() => ({}));
    if (!refresh_token) return jsonError('refresh_token is required.', 400);

    const adminSupa = createAdminClient();
    const { data, error } = await adminSupa.auth.refreshSession({ refresh_token });
    if (error || !data?.session) {
      return jsonError('Session expired. Please sign in again.', 401);
    }
    return jsonResponse({
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}
