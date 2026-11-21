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

    // Fetch organization information
    const { data: departments, error: deptError } = await adminSupa
      .from('departments')
      .select('id, name, code, description, is_active')
      .order('name', { ascending: true });

    if (deptError) {
      return jsonError('Failed to fetch departments', 500);
    }

    // Fetch all roles for reference
    const { data: roles, error: rolesError } = await adminSupa
      .from('roles')
      .select('id, name, code, is_system')
      .order('name', { ascending: true });

    if (rolesError) {
      return jsonError('Failed to fetch roles', 500);
    }

    // Count totals for organization overview
    const { count: totalEmployees, error: empError } = await adminSupa
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('account_type', 'employee');

    if (empError) {
      return jsonError('Failed to fetch employee count', 500);
    }

    const { count: totalCustomers, error: custError } = await adminSupa
      .from('customers')
      .select('*', { count: 'exact', head: true });

    if (custError) {
      return jsonError('Failed to fetch customer count', 500);
    }

    const { count: totalLeads, error: leadsError } = await adminSupa
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (leadsError) {
      return jsonError('Failed to fetch lead count', 500);
    }

    return jsonResponse({
      departments: departments || [],
      roles: roles || [],
      stats: {
        totalEmployees: totalEmployees || 0,
        totalCustomers: totalCustomers || 0,
        totalLeads: totalLeads || 0,
      },
    }, { message: 'Admin settings fetched successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/settings
export async function OPTIONS() {
  return handleOptions();
}