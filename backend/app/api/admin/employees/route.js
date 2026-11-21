import { jsonResponse, jsonError, handleOptions, corsHeaders } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';
import { getUserFromRequest } from '@/lib/supabase/auth';
import { uuidSchema, searchFilterPaginationSchema } from '@/lib/validations';

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

    // Parse query parameters for search, filter, pagination
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build the query
    let query = adminSupa.from('profiles').select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`);
    }

    if (department) {
      query = query.eq('department_id', department);
    }

    if (role) {
      // First get role ID, then filter by it
      const { data: roleInfo } = await adminSupa.from('roles').select('id').eq('code', role).single();
      if (roleInfo) {
        query = query.eq('role_id', roleInfo.id);
      }
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    // Order by joining date (created_at desc) or name
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: employees, error: employeesError } = await query;

    if (employeesError) {
      return jsonError('Failed to fetch employees', 500);
    }

    const countResult = await adminSupa.from('profiles').select('*', { count: 'exact', head: true });
    const totalCount = countResult ? countResult : (employees ? employees.length : 0);

    return jsonResponse({
      employees,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    }, { message: 'Employees fetched successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/employees
export async function OPTIONS() {
  return handleOptions();
}