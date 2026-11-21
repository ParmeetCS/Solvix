import { jsonResponse, jsonError, handleOptions, corsHeaders } from '@/lib/utils';
import { createAdminClient, createClientFromToken } from '@/lib/supabase/client';
import { getUserFromRequest } from '@/lib/supabase/auth';
import { uuidParamSchema } from '@/lib/validations';

export async function GET() {
  return jsonResponse({ name: 'SOLVIX Admin API', version: '1.0.0' }, {
    message: 'SOLVIX Admin v1',
    headers: corsHeaders(),
  });
}

// Handle CORS preflight for /api/admin/employees/*
export async function OPTIONS() {
  return handleOptions();
}

// PATCH /api/admin/employees/[id]/department
export async function PATCH(request) {
  try {
    // Extract id from the URL path
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return jsonError('Employee ID is required', 400);
    }

    const body = await request.json();
    const { departmentId } = body;

    if (!departmentId) {
      return jsonError('Department ID is required', 400);
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

    // Update the employee's department
    const { data: updatedProfile, error: updateError } = await adminSupa
      .from('profiles')
      .update({
        department_id: departmentId,
        department_requested: null, // Clear the requested department
      })
      .eq('auth_user_id', id)
      .select()
      .single();

    if (updateError) {
      return jsonError('Failed to assign department: ' + updateError.message, 400);
    }

    return jsonResponse({
      message: 'Department assigned successfully',
      profile: updatedProfile,
    }, { message: 'Department assigned successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}