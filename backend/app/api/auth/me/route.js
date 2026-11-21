import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';
import { getUserFromRequest } from '@/lib/supabase/auth';
import { buildSessionUser, loadProfileByAuthId } from '@/lib/supabase/session';

export async function OPTIONS() {
  return handleOptions();
}

/** GET /api/auth/me - validates the bearer token and returns the live session user. */
export async function GET(request) {
  try {
    const { user, error } = await getUserFromRequest(request);
    if (error || !user) return jsonError('Not authenticated', 401);

    const adminSupa = createAdminClient();
    const { profile } = await loadProfileByAuthId(adminSupa, user.id);
    if (!profile) return jsonError('Profile not found', 404);
    if (!profile.is_active) return jsonError('Account suspended', 403);

    return jsonResponse({ user: await buildSessionUser(adminSupa, user, profile) });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}
