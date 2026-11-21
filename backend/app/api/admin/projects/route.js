import { jsonResponse, jsonError, handleOptions, corsHeaders } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';
import { getUserFromRequest } from '@/lib/supabase/auth';
import { searchFilterPaginationSchema } from '@/lib/validations';

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
    const status = searchParams.get('status') || '';
    const department = searchParams.get('department') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build the query
    let query = adminSupa.from('installations').select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`installation_code.ilike.%${search}%,customer_id.name.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (department) {
      // Filter by department - join through orders or customers
      query = query.eq('customer_id', department); // Simplified - filter by customer
    }

    // Order by creation date
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: projects, error: projectsError } = await query;

    if (projectsError) {
      return jsonError('Failed to fetch projects', 500);
    }

    const totalCount = projectsError ? 0 : (await adminSupa.from('installations').select('*', { count: 'exact', head: true })).count;

    return jsonResponse({
      projects,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    }, { message: 'Projects fetched successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/projects
export async function OPTIONS() {
  return handleOptions();
}