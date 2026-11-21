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

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const department = searchParams.get('department') || '';

    // Build base query with date filtering
    let query = adminSupa.from('activity_logs').select(`
      id,
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata,
      department_id,
      created_at,
      profiles!actor_id (full_name, email)
    `);

    // Apply date filter if provided
    if (dateFrom || dateTo) {
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }
    }

    // Apply department filter if provided
    if (department) {
      query = query.eq('department_id', department);
    }

    // Order by creation date descending
    query = query.order('created_at', { ascending: false });

    const { data: activityLogs, error: logsError } = await query;

    if (logsError) {
      return jsonError('Failed to fetch activity logs', 500);
    }

    // Format the activity logs for response
    const formattedLogs = activityLogs.map(log => ({
      id: log.id,
      user: log.profiles ? log.profiles.full_name : 'System',
      action: log.action,
      entity: log.entity_type || 'Unknown',
      timestamp: log.created_at,
      department: log.department_id || null,
      metadata: log.metadata || {},
    }));

    // Compute summary statistics
    const actionCounts = {};
    const departmentCounts = {};

    if (formattedLogs) {
      formattedLogs.forEach(log => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
        if (log.department) {
          departmentCounts[log.department] = (departmentCounts[log.department] || 0) + 1;
        }
      });
    }

    // Fetch department options for the filter
    const { data: departments, error: deptError } = await adminSupa
      .from('departments')
      .select('id, name')
      .order('name', { ascending: true });

    if (deptError) {
      return jsonError('Failed to fetch departments', 500);
    }

    return jsonResponse({
      activityLogs: formattedLogs,
      summary: {
        totalActions: formattedLogs.length,
        actionCounts,
        departmentCounts: Object.keys(departmentCounts).length > 0 ? departmentCounts : null,
      },
      availableDepartments: departments || [],
    }, { message: 'Reports fetched successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/reports
export async function OPTIONS() {
  return handleOptions();
}