import { jsonResponse, jsonError, handleOptions, corsHeaders } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';
import { getUserFromRequest } from '@/lib/supabase/auth';

export async function GET(request, { params }) {
  try {
    const { id: paramId } = (await params) || {};
    const url = new URL(request.url);
    const id = paramId || url.pathname.split('/').pop() || url.searchParams.get('id');
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

    if (!id) {
      return jsonError('Employee ID is required', 400);
    }

    // Fetch employee profile with department and role info
    const { data: employee, error: employeeError } = await adminSupa
      .from('profiles')
      .select(`
        id,
        auth_user_id,
        full_name,
        email,
        phone,
        avatar_url,
        department_id,
        role_id,
        is_active,
        created_at,
        updated_at,
        departments!profiles_department_id_fkey (id, name, code, description),
        roles!profiles_role_id_fkey (id, name, code, description)
      `)
      .eq('id', id)
      .single();

    if (employeeError) {
      return jsonError('Employee not found', 404);
    }

    // Fetch employee's assigned departments
    const { data: assignedDepts, error: deptError } = await adminSupa
      .from('employee_departments')
      .select(`
        department_id,
        departments (id, name, code),
        is_primary,
        is_approved
      `)
      .eq('employee_id', id);

    if (deptError) {
      return jsonError('Failed to fetch employee departments', 500);
    }

    // Format the response
    const formattedEmployee = {
      ...employee,
      assignedDepartments: assignedDepts || [],
    };

    return jsonResponse(formattedEmployee);
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/employees/[id]
export async function OPTIONS() {
  return handleOptions();
}