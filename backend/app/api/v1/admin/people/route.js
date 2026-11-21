import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireAdminActor } from '@/lib/supabase/access';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/admin/people
 * Employees (with approval state), departments (with head-counts) and roles,
 * in one parallel round trip. Customers are managed in the Sales module.
 */
export async function GET(request) {
  try {
    const { actor, error, status } = await requireAdminActor(request);
    if (error) return jsonError(error, status);
    const db = actor.adminClient;

    const [employees, departments, roles] = await Promise.all([
      db.from('profiles')
        .select('id, auth_user_id, full_name, email, phone, employee_id, is_active, department_requested, department_id, role_id, created_at, department:department_id ( id, name, code ), role:role_id ( id, name, code )')
        .eq('account_type', 'employee')
        .order('created_at', { ascending: false }),
      db.from('departments').select('id, name, code, description, is_active').order('name'),
      db.from('roles').select('id, name, code').order('name'),
    ]);

    const failed = [employees, departments, roles].find((r) => r.error);
    if (failed) return jsonError('Could not load people: ' + failed.error.message, 500);

    const staff = (employees.data || []).map((e) => ({
      ...e,
      status: !e.is_active ? 'inactive' : e.department_id ? 'approved' : 'pending',
    }));
    const counts = {};
    staff.forEach((e) => { if (e.department_id && e.is_active) counts[e.department_id] = (counts[e.department_id] || 0) + 1; });

    return jsonResponse({
      employees: staff,
      departments: (departments.data || []).map((d) => ({ ...d, employee_count: counts[d.id] || 0 })),
      roles: roles.data || [],
    });
  } catch (err) {
    return jsonError('Server error: ' + err.message, 500);
  }
}
