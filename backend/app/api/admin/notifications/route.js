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

    // Parse query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const type = searchParams.get('type') || '';
    const read = searchParams.get('read'); // 'true' or 'false' or undefined
    const recipient = searchParams.get('recipient') || '';

    // Build the query
    let query = adminSupa.from('notifications').select('*', { count: 'exact' });

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (read !== undefined) {
      query = query.eq('read', read === 'true');
    }

    if (recipient) {
      query = query.eq('recipient_id', recipient);
    }

    // Order by creation date descending
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: notifications, error: notifError } = await query;

    if (notifError) {
      return jsonError('Failed to fetch notifications', 500);
    }

    const totalCount = notifError ? 0 : (await adminSupa.from('notifications').select('*', { count: 'exact', head: true })).count;

    // Mark notifications as read when fetched (simple approach)
    // In a real system, this would be done selectively
    if (notifications && notifications.length > 0 && read === 'false') {
      const unreadIds = notifications.map(n => n.id);
      // We'll just note this but not block the response
      // adminSupa.from('notifications').update({ read: true, read_at: new Date() }).in('id', unreadIds);
    }

    return jsonResponse({
      notifications,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    }, { message: 'Notifications fetched successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/notifications
export async function OPTIONS() {
  return handleOptions();
}