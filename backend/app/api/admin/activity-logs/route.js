import { jsonResponse, jsonError, handleOptions, corsHeaders } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';
import { getUserFromRequest } from '@/lib/supabase/auth';

export async function GET(request) {
  try {
    // Verify admin authentication
    const { user, error: userError } = await getUserFromRequest(request);

    if (userError || !user) {
      return jsonError('Authentication failed', 401);
    }

    // Check if user has admin role
    const adminSupa = createAdminClient();
    const { data: profileData, error: profileError } = await adminSupa
      .from('profiles')
      .select('role_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profileData) {
      return jsonError('User profile not found', 404);
    }

    const { data: roleData, error: roleError } = await adminSupa
      .from('roles')
      .select('code')
      .eq('id', profileData.role_id)
      .single();

    if (roleError || roleData.code !== 'admin') {
      return jsonError('Admin privileges required', 403);
    }

    // Parse query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const action = searchParams.get('action') || '';
    const entityType = searchParams.get('entityType') || '';

    // Build the query
    let query = adminSupa.from('activity_logs').select('*', { count: 'exact' });

    // Apply filters
    if (action) {
      query = query.eq('action', action);
    }

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    // Order by creation date descending
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: activityLogs, error: logsError } = await query;

    if (logsError) {
      return jsonError('Failed to fetch activity logs', 500);
    }

    const totalCount = logsError ? 0 : (await adminSupa.from('activity_logs').select('*', { count: 'exact', head: true })).count;

    // Format the activity logs for response
    const formattedLogs = activityLogs.map(log => ({
      id: log.id,
      user: log.actor_id ? 'Profile ' + log.actor_id : 'System',
      action: log.action,
      entity: log.entity_type || 'Unknown',
      entityId: log.entity_id,
      timestamp: log.created_at,
      department: log.department_id || null,
      metadata: log.metadata || {},
    }));

    return jsonResponse({
      activityLogs: formattedLogs,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    }, { message: 'Activity logs fetched successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/activity-logs
export async function OPTIONS() {
  return handleOptions();
}