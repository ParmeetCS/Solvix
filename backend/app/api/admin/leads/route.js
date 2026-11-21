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
    const source = searchParams.get('source') || '';
    const assignedTo = searchParams.get('assignedTo') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build the query
    let query = adminSupa.from('leads').select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`lead_code.ilike.%${search}%,contact_name.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (source) {
      query = query.eq('source', source);
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    // Order by creation date
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      return jsonError('Failed to fetch leads', 500);
    }

    const totalCount = leadsError ? 0 : (await adminSupa.from('leads').select('*', { count: 'exact', head: true })).count;

    return jsonResponse({
      leads,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    }, { message: 'Leads fetched successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/leads
export async function OPTIONS() {
  return handleOptions();
}