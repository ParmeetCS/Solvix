import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireAdminActor } from '@/lib/supabase/access';

export async function OPTIONS() {
  return handleOptions();
}

/** GET /api/v1/admin/overview - everything the Admin overview page shows, in one database call. */
export async function GET(request) {
  try {
    const { actor, error, status } = await requireAdminActor(request);
    if (error) return jsonError(error, status);

    const { data, error: dbError } = await actor.adminClient.rpc('admin_overview');
    if (dbError) return jsonError('Could not load the overview: ' + dbError.message, 500);

    return jsonResponse(data);
  } catch (err) {
    return jsonError('Server error: ' + err.message, 500);
  }
}
