import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/sales/employees
 * Lists sales employees available for lead assignment, with their current active lead count.
 */
export async function GET(request) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;

    // Fetch active employees
    const { data: employees, error } = await adminClient
      .from('profiles')
      .select('id, full_name, email, phone, account_type, is_active, role_id, department_id, department:department_id ( name, code )')
      .eq('account_type', 'employee')
      .eq('is_active', true);

    if (error) {
      return jsonError('Failed to fetch employees: ' + error.message, 500);
    }

    // Fetch lead assignment counts for these employees
    const { data: activeLeads } = await adminClient
      .from('leads')
      .select('assigned_to, status')
      .not('status', 'in', '("converted","lost","disqualified")');

    const counts = {};
    (activeLeads || []).forEach(l => {
      if (l.assigned_to) {
        counts[l.assigned_to] = (counts[l.assigned_to] || 0) + 1;
      }
    });

    // Leads are worked by the Sales team: offer sales people only, so a lead is not handed to (and lost in)
    // another department. Fall back to everyone if no sales department has been set up yet.
    const salesStaff = (employees || []).filter((e) => /sales|crm/i.test(`${e.department?.code || ''} ${e.department?.name || ''}`));
    const pool = salesStaff.length > 0 ? salesStaff : (employees || []);

    const employeesWithCounts = pool.map(emp => ({
      ...emp,
      activeLeadCount: counts[emp.id] || 0
    }));

    return jsonResponse(employeesWithCounts);
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
