import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSupportOrAdmin } from '@/lib/supabase/supportAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/support/agents
 * Lists support staff and technicians available for assignment.
 */
export async function GET(request) {
  try {
    const authResult = await requireSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;

    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        phone,
        account_type,
        role_id,
        department_id,
        roles:role_id ( id, name, code ),
        departments:department_id ( id, name, code )
      `)
      .in('account_type', ['employee', 'admin'])
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) {
      return jsonError('Database error fetching agents: ' + error.message, 500);
    }

    // Also get technicians
    const { data: techs } = await adminClient
      .from('technicians')
      .select('id, profile_id, employee_code, skills, is_available');

    const techMap = {};
    (techs || []).forEach((t) => {
      techMap[t.profile_id] = t;
    });

    const agents = (profiles || []).map((p) => ({
      id: p.id,
      name: p.full_name || p.email,
      email: p.email,
      phone: p.phone,
      role: p.roles?.name || p.account_type,
      department: p.departments?.name || 'Customer Operations',
      technician: techMap[p.id] || null
    }));

    return jsonResponse({ agents });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
