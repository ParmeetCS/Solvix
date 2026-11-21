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

    // Fetch all departments
    const { data: departments, error: departmentsError } = await adminSupa
      .from('departments')
      .select('id, name, code, description, is_active, created_at')
      .order('name', { ascending: true });

    if (departmentsError) {
      return jsonError('Failed to fetch departments', 500);
    }

    // Count employees in each department
    const deptIds = departments.map(d => d.id);
    let employeeCounts = {};
    if (deptIds.length > 0) {
      const { count: total, error: countError } = await adminSupa
        .from('employee_departments')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true);
      
      if (!countError && total) {
        // Count per department
        for (const deptId of deptIds) {
          const { count: deptCount } = await adminSupa
            .from('employee_departments')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', deptId)
            .eq('is_approved', true);
          employeeCounts[deptId] = deptCount || 0;
        }
      }
    }

    // Format response with employee counts
    const formattedDepartments = departments.map(dept => ({
      ...dept,
      employeeCount: employeeCounts[dept.id] || 0,
    }));

    return jsonResponse(formattedDepartments, { message: 'Departments fetched successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/departments
export async function OPTIONS() {
  return handleOptions();
}