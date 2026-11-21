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

    // 1. Projects by status
    const { data: projectsByStatus, error: projStatusError } = await adminSupa
      .from('installations')
      .select('status');

    if (projStatusError) {
      return jsonError('Failed to fetch project status data', 500);
    }

    // Count projects by status
    const statusCounts = {};
    if (projectsByStatus) {
      projectsByStatus.forEach(p => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      });
    }

    // 2. Leads by status
    const { data: leadsByStatus, error: leadsStatusError } = await adminSupa
      .from('leads')
      .select('status');

    if (leadsStatusError) {
      return jsonError('Failed to fetch lead status data', 500);
    }

    const leadStatusCounts = {};
    if (leadsByStatus) {
      leadsByStatus.forEach(l => {
        leadStatusCounts[l.status] = (leadStatusCounts[l.status] || 0) + 1;
      });
    }

    // 3. Employee distribution by department
    const { data: employeeDeptDist, error: deptError } = await adminSupa
      .from('employee_departments')
      .select(`
        department_id,
        profiles!employee_departments_employee (full_name, is_approved)
      `)
      .eq('is_approved', true);

    if (deptError) {
      return jsonError('Failed to fetch employee distribution data', 500);
    }

    // Count employees per department
    const deptCounts = {};
    if (employeeDeptDist) {
      employeeDeptDist.forEach(ed => {
        const deptId = ed.department_id;
        deptCounts[deptId] = (deptCounts[deptId] || 0) + 1;
      });
    }

    // 4. Monthly project creation trend (last 6 months)
    const { data: projectCreation, error: trendError } = await adminSupa
      .from('installations')
      .select('created_at')
      .order('created_at', { ascending: false });

    if (trendError) {
      return jsonError('Failed to fetch project trend data', 500);
    }

    // Group by month - simplified, just return raw dates for now
    const monthlyTrends = [];
    if (projectCreation) {
      const monthMap = {};
      projectCreation.forEach(p => {
        const month = p.created_at ? p.created_at.substring(0, 7) : 'unknown';
        monthMap[month] = (monthMap[month] || 0) + 1;
      });
      monthlyTrends.push({ label: 'Monthly Projects', data: monthMap });
    }

    // 5. Revenue and expenses overview
    // Revenue from invoices with status 'paid'
    const { data: paidInvoices, error: revenueError } = await adminSupa
      .from('invoices')
      .select('total_amount, status')
      .eq('status', 'paid');

    let totalRevenue = 0;
    if (paidInvoices) {
      totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    }

    // Expenses
    const { data: expenseRecords, error: expenseError } = await adminSupa
      .from('expenses')
      .select('amount');

    let totalExpenses = 0;
    if (expenseRecords) {
      totalExpenses = expenseRecords.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    }

    // Net revenue
    const netRevenue = totalRevenue - totalExpenses;

    return jsonResponse({
      projectsByStatus: statusCounts,
      leadsByStatus: leadStatusCounts,
      employeeDistributionByDepartment: deptCounts,
      monthlyProjectTrends: monthlyTrends,
      revenue: totalRevenue,
      expenses: totalExpenses,
      netRevenue: netRevenue,
    }, { message: 'Dashboard chart data fetched successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/dashboard/charts
export async function OPTIONS() {
  return handleOptions();
}