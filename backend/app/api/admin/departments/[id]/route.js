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
      return jsonError('Department ID is required', 400);
    }

    // Fetch department details
    const { data: department, error: departmentError } = await adminSupa
      .from('departments')
      .select(`
        id,
        name,
        code,
        description,
        is_active,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (departmentError) {
      return jsonError('Department not found', 404);
    }

    // Fetch employees assigned to this department
    const { data: assignedEmployees, error: employeesError } = await adminSupa
      .from('employee_departments')
      .select(`
        employee_id,
        profiles!employee_departments_employee (id, full_name, email, role_id, is_active),
        is_primary,
        is_approved
      `)
      .eq('department_id', id);

    if (employeesError) {
      return jsonError('Failed to fetch department employees', 500);
    }

    // Format employee list
    const employeeList = assignedEmployees.map(ed => ({
      id: ed.employee_id,
      full_name: ed.profiles.full_name,
      email: ed.profiles.email,
      role_id: ed.profiles.role_id,
      is_active: ed.profiles.is_active,
      is_primary: ed.is_primary,
      is_approved: ed.is_approved,
    }));

    return jsonResponse({
      department,
      assignedEmployees: employeeList,
      employeeCount: employeeList.length,
    }, { message: 'Department details fetched successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/departments/[id]
export async function OPTIONS() {
  return handleOptions();
}