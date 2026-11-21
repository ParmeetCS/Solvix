import { jsonResponse, jsonError, handleOptions, corsHeaders } from '@/lib/utils';
import { createAdminClient, createClientFromToken } from '@/lib/supabase/client';
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

    // Check if the user has admin privileges
    const { data: roleData, error: roleError } = await adminSupa
      .from('roles')
      .select('code')
      .eq('id', profileData.role_id)
      .single();

    if (roleError || roleData.code !== 'admin') {
      return jsonError('Admin privileges required', 403);
    }

    // Fetch pending employee access requests - simplified query
    const { data: requests, error: requestsError } = await adminSupa
      .from('profiles')
      .select('id, full_name, email, account_type, department_requested, is_active')
      .eq('account_type', 'employee')
      .eq('is_active', true);

    if (requestsError) {
      return jsonError('Failed to fetch employee requests', 500);
    }

    // Filter for pending employees (department_requested set, department_id null)
    const pendingRequests = requests.filter(
      (profile) => profile.department_requested && !profile.department_id
    );

    return jsonResponse({
      requests: pendingRequests,
      count: pendingRequests.length,
    }, { message: 'Employee requests fetched successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/employee-requests
export async function OPTIONS() {
  return handleOptions();
}

// PATCH /api/admin/employee-requests/[id]
export async function PATCH(request) {
  try {
    const { id } = await request.json();
    const { action } = await request.json();

    if (!id || !action) {
      return jsonError('Missing required fields: id and action', 400);
    }

    if (action !== 'approve' && action !== 'reject') {
      return jsonError('Invalid action. Must be "approve" or "reject"', 400);
    }

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

    // Update the employee profile based on the action
    if (action === 'approve') {
      const { data: updatedProfile, error: updateError } = await adminSupa
        .from('profiles')
        .update({
          department_id: null,
          department_requested: null,
          is_active: true,
        })
        .eq('auth_user_id', id)
        .select()
        .single();

      if (updateError) {
        return jsonError('Failed to approve employee: ' + updateError.message, 400);
      }

      return jsonResponse({
        message: 'Employee approved successfully',
        profile: updatedProfile,
      }, { message: 'Employee approved successfully' });
    } else if (action === 'reject') {
      const { data: updatedProfile, error: updateError } = await adminSupa
        .from('profiles')
        .update({
          is_active: false,
        })
        .eq('auth_user_id', id)
        .select()
        .single();

      if (updateError) {
        return jsonError('Failed to reject employee: ' + updateError.message, 400);
      }

      return jsonResponse({
        message: 'Employee request rejected',
        profile: updatedProfile,
      }, { message: 'Employee request rejected' });
    }

  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}