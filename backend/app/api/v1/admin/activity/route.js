import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireAdminActor } from '@/lib/supabase/access';

export async function OPTIONS() {
  return handleOptions();
}

/** GET /api/v1/admin/activity?page=1&limit=25&search= */
export async function GET(request) {
  try {
    const { actor, error, status } = await requireAdminActor(request);
    if (error) return jsonError(error, status);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const search = (searchParams.get('search') || '').replace(/[%,()]/g, '').trim();
    const offset = (page - 1) * limit;

    let query = actor.adminClient
      .from('activity_logs')
      .select('id, action, entity_type, entity_id, metadata, created_at, actor:actor_id ( id, full_name, email )', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (search) query = query.or(`action.ilike.%${search}%,entity_type.ilike.%${search}%`);

    const { data, count, error: dbError } = await query;
    if (dbError) return jsonError('Could not load activity: ' + dbError.message, 500);

    return jsonResponse({
      logs: data || [],
      pagination: { total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) },
    });
  } catch (err) {
    return jsonError('Server error: ' + err.message, 500);
  }
}
