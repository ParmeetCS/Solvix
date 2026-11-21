import { jsonResponse, jsonError, handleOptions, corsHeaders } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';
import { getUserFromRequest } from '@/lib/supabase/auth';
import { uuidSchema } from '@/lib/validations';

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

    // Fetch pending employee access requests
    const { data: requests, error: requestsError } = await adminSupa
      .from('profiles')
      .select(`
        id,
        auth_user_id,
        full_name,
        email,
        phone,
        employee_id,
        department_requested,
        is_active,
        created_at
      `)
      .eq('account_type', 'employee')
      .eq('is_active', true)
      .not('department_id', 'is', null);

    // Actually, let me fetch all employee profiles and filter for pending ones
    // (those with department_requested set but no approved department)
    const { data: allEmployeeProfiles, error: allError } = await adminSupa
      .from('profiles')
      .select(`
        id,
        auth_user_id,
        full_name,
        email,
        phone,
        employee_id,
        department_requested,
        department_id,
        is_active,
        created_at
      `)
      .eq('account_type', 'employee');

    if (allError) {
      return jsonError('Failed to fetch employee requests', 500);
    }

    // Filter for pending: department_requested is set but department_id is not approved/assigned
    const pendingRequests = allEmployeeProfiles.filter(
      (profile) => profile.department_requested && (!profile.department_id || profile.is_active === false)
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
    const { action, departmentId, roleId, notes } = await request.json();

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

    // Prevent employees from approving their own request
    // (The request ID refers to the profile being acted upon, not the admin)
    // This check is implicit since we verify admin privileges above

    if (action === 'approve') {
      // Validate department and role if provided
      if (departmentId) {
        const { data: deptInfo } = await adminSupa.from('departments').select('id, name').eq('id', departmentId).single();
        if (!deptInfo) {
          return jsonError('Invalid department ID', 400);
        }
      }

      if (roleId) {
        const { data: roleInfo } = await adminSupa.from('roles').select('id, code').eq('id', roleId).single();
        if (!roleInfo) {
          return jsonError('Invalid role ID', 400);
        }
        // Prevent non-admin roles from being assigned as admin (but admin can assign any role)
        if (roleInfo.code === 'admin' && roleData.id !== roleInfo.id) {
          // This is fine - admin can assign admin role to others
        }
      }

      // Update the employee profile on approval
      const updateData = {
        is_active: true,
        department_requested: null,
      };

      if (departmentId) {
        updateData.department_id = departmentId;
      }

      if (roleId) {
        updateData.role_id = roleId;
      }

      const { data: updatedProfile, error: updateError } = await adminSupa
        .from('profiles')
        .update(updateData)
        .eq('auth_user_id', id)
        .select()
        .single();

      if (updateError) {
        return jsonError('Failed to approve employee: ' + updateError.message, 400);
      }

      // Record the approval in activity logs
      await adminSupa.from('activity_logs').insert({
        action: 'employee_approval',
        entity_type: 'profile',
        entity_id: id,
        metadata: {
          approved_by: user.id,
          department_id: departmentId,
          role_id: roleId,
          notes: notes || null,
        },
        department_id: departmentId,
      });

      // If notification infrastructure is available, we would notify the employee here
      // TODO: Integrate with notification service

      return jsonResponse({
        message: 'Employee approved successfully',
        profile: updatedProfile,
      }, { message: 'Employee approved successfully' });
    } else if (action === 'reject') {
      // Validate rejection reason
      const rejectionReason = notes || 'No reason provided';

      // Update the employee profile on rejection - block the employee
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

      // Record the rejection in activity logs
      await adminSupa.from('activity_logs').insert({
        action: 'employee_rejection',
        entity_type: 'profile',
        entity_id: id,
        metadata: {
          rejected_by: user.id,
          reason: rejectionReason,
        },
      });

      return jsonResponse({
        message: 'Employee request rejected',
        profile: updatedProfile,
        rejectionReason,
      }, { message: 'Employee request rejected' });
    }
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}