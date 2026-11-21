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

    // Fetch revenue from paid invoices
    const { data: paidInvoices, error: revenueError } = await adminSupa
      .from('invoices')
      .select('total_amount, status')
      .eq('status', 'paid');

    let totalRevenue = 0;
    if (paidInvoices) {
      totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    }

    // Fetch pending payments - orders that are confirmed but not completed
    const { data: confirmedOrders, error: ordersError } = await adminSupa
      .from('orders')
      .select('id, status, total_amount, advance_paid, balance_due')
      .in('status', ['confirmed', 'in_production', 'ready_for_install', 'installing']);

    let pendingPayments = 0;
    let totalOutstanding = 0;

    if (confirmedOrders) {
      pendingPayments = confirmedOrders.length;
      totalOutstanding = confirmedOrders.reduce((sum, order) => {
        return sum + (order.balance_due || 0);
      }, 0);
    }

    // Fetch expenses
    const { data: expenseRecords, error: expenseError } = await adminSupa
      .from('expenses')
      .select('amount, category, incurred_date');

    let totalExpenses = 0;
    if (expenseRecords) {
      totalExpenses = expenseRecords.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    }

    // Fetch recent financial transactions
    const { data: financialTransactions, error: txError } = await adminSupa
      .from('financial_transactions')
      .select(`
        id,
        transaction_type,
        amount,
        currency,
        transaction_date,
        recorded_by (full_name)
      `)
      .order('transaction_date', { ascending: false })
      .limit(10);

    if (txError) {
      return jsonError('Failed to fetch financial transactions', 500);
    }

    // Calculate net revenue
    const netRevenue = totalRevenue - totalExpenses;

    // Count invoices by status
    const { count: totalInvoices, error: totalInvError } = await adminSupa
      .from('invoices')
      .select('*', { count: 'exact', head: true });

    const { count: paidInvoicesCount, error: paidInvError } = await adminSupa
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'paid');

    const { count: unpaidInvoicesCount, error: unpaidInvError } = await adminSupa
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .in('status', ['sent', 'under_review', 'overdue']);

    return jsonResponse({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      pendingPayments,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      invoiceStats: {
        total: totalInvoices || 0,
        paid: paidInvoicesCount || 0,
        unpaid: unpaidInvoicesCount || 0,
      },
      recentTransactions: financialTransactions || [],
    }, { message: 'Finance overview fetched successfully' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/admin/finance/overview
export async function OPTIONS() {
  return handleOptions();
}