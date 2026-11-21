import { jsonResponse, jsonError, handleOptions, corsHeaders } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';
import { getUserFromRequest } from '@/lib/supabase/auth';

export async function PATCH(request) {
  try {
    // Extract id from the URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return jsonError('Employee ID is required', 400);
    }

    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus) {
      return jsonError('Status is required', 400);
    }

    // Valid statuses
    const validStatuses = ['pending', 'approved', 'rejected', 'suspended'];
    if (!validStatuses.includes(newStatus)) {
      return jsonError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
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

    // Update the employee's status
    const { data: updatedProfile, error: updateError } = await adminSupa
      .from('profiles')
      .update({
        is_active: newStatus !== 'suspended',
      })
      .eq('auth_user_id', id)
      .select()
      .single();

    if (updateError) {
      return jsonError('Failed to update employee status: ' + updateError.message, 400);
    }

    // Return appropriate message based on status
    let message = '';
    if (newStatus === 'approved') {
      message = 'Employee account activated';
    } else if (newStatus === 'rejected') {
      message = 'Employee request denied';
    } else if (newStatus === 'suspended') {
      message = 'Employee account suspended';
    } else {
      message = 'Employee status updated';
    }

    // Record the status change in activity logs
    await adminSupa.from('activity_logs').insert({
      action: 'status_update',
      entity_type: 'profile',
      entity_id: id,
      metadata: { previousStatus: null, newStatus: newStatus },
    });

    return jsonResponse({
      message,
      profile: updatedProfile,
    }, { message });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/employees/[id]/status
export async function OPTIONS() {
  return handleOptions();
}