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
      .select('id, full_name, email, phone, account_type, is_active, role_id, department_id')
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

    const employeesWithCounts = (employees || []).map(emp => ({
      ...emp,
      activeLeadCount: counts[emp.id] || 0
    }));

    return jsonResponse(employeesWithCounts);
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
