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

    // Fetch recent activity from activity_logs
    const { data: recentActivity, error: activityError } = await adminSupa
      .from('activity_logs')
      .select(`
        id,
        actor_id,
        action,
        entity_type,
        entity_id,
        metadata,
        department_id,
        created_at,
        profiles!actor_id (full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (activityError) {
      return jsonError('Failed to fetch recent activity', 500);
    }

    // Format activity for response
    const formattedActivity = recentActivity.map(item => ({
      id: item.id,
      user: item.profiles ? item.profiles.full_name : 'System',
      action: item.action,
      entity: item.entity_type || 'Unknown',
      timestamp: item.created_at,
      metadata: item.metadata || {},
      department: item.department_id ? 'Dept ' + item.department_id : null,
    }));

    // Fetch recent employee registrations
    const { data: recentEmployees, error: empError } = await adminSupa
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        phone,
        department_requested,
        is_active,
        created_at
      `)
      .eq('account_type', 'employee')
      .order('created_at', { ascending: false })
      .limit(5);

    if (empError) {
      return jsonError('Failed to fetch recent employees', 500);
    }

    // Fetch recent customer registrations
    const { data: recentCustomers, error: custError } = await adminSupa
      .from('customers')
      .select(`
        id,
        customer_code,
        contact_name,
        email,
        status,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (custError) {
      return jsonError('Failed to fetch recent customers', 500);
    }

    // Fetch latest project updates (installations)
    const { data: recentProjects, error: projError } = await adminSupa
      .from('installations')
      .select(`
        id,
        installation_code,
        status,
        system_capacity_kw,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (projError) {
      return jsonError('Failed to fetch recent projects', 500);
    }

    // Fetch recent leads
    const { data: recentLeads, error: leadsError } = await adminSupa
      .from('leads')
      .select(`
        id,
        lead_code,
        status,
        source,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (leadsError) {
      return jsonError('Failed to fetch recent leads', 500);
    }

    return jsonResponse({
      recentActivity: formattedActivity,
      recentEmployeeRegistrations: recentEmployees || [],
      recentCustomerRegistrations: recentCustomers || [],
      latestProjectUpdates: recentProjects || [],
      recentLeads: recentLeads || [],
    }, { message: 'Recent activity fetched successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/dashboard/recent-activity
export async function OPTIONS() {
  return handleOptions();
}