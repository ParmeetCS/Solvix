import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireFinanceOrAdmin } from '@/lib/supabase/financeAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/finance/dashboard
 * Live aggregation of financial figures from orders, invoices, payments, expenses, project_costs, and transactions.
 * Clearly distinguishes Quotation value, Order value, Invoiced amount, Collected payment, Outstanding balance.
 */
export async function GET(request) {
  try {
    const authResult = await requireFinanceOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;

    // 1. Fetch Orders for Order Revenue, Advance, and Balance Due
    const { data: orders, error: ordersErr } = await adminClient
      .from('orders')
      .select('id, order_code, total_amount, advance_paid, balance_due, status, payment_status, created_at');

    if (ordersErr) {
      return jsonError('Failed to fetch orders: ' + ordersErr.message, 500);
    }

    const allOrders = orders || [];
    let totalOrderValue = 0;
    let totalPendingBalance = 0;

    allOrders.forEach((o) => {
      totalOrderValue += parseFloat(o.total_amount) || 0;
      totalPendingBalance += parseFloat(o.balance_due) || 0;
    });

    // 2. Fetch Payments (Collected Revenue vs Pending)
    const { data: payments, error: paymentsErr } = await adminClient
      .from('payments')
      .select('id, payment_code, amount, payment_type, payment_method, status, paid_at, customer_id, order_id, customers:customer_id(contact_name), orders:order_id(order_code)')
      .order('paid_at', { ascending: false });

    if (paymentsErr) {
      return jsonError('Failed to fetch payments: ' + paymentsErr.message, 500);
    }

    const allPayments = payments || [];
    let totalCollectedPayments = 0;
    let totalRefundedPayments = 0;
    const paymentStatusDistribution = { recorded: 0, verified: 0, failed: 0, refunded: 0 };
    const paymentMethodDistribution = {};

    allPayments.forEach((p) => {
      const amt = parseFloat(p.amount) || 0;
      const st = p.status || 'recorded';
      paymentStatusDistribution[st] = (paymentStatusDistribution[st] || 0) + 1;

      const m = p.payment_method || 'other';
      paymentMethodDistribution[m] = (paymentMethodDistribution[m] || 0) + amt;

      if (st === 'verified' || st === 'recorded') {
        if (p.payment_type === 'refund') {
          totalRefundedPayments += amt;
        } else {
          totalCollectedPayments += amt;
        }
      }
    });

    const netCollectedRevenue = totalCollectedPayments - totalRefundedPayments;

    // 3. Fetch Invoices and calculate Invoiced amount
    const { data: invoices, error: invErr } = await adminClient
      .from('invoices')
      .select(`
        id,
        invoice_code,
        status,
        issue_date,
        due_date,
        order_id,
        customer_id,
        customers:customer_id(id, contact_name, phone, email),
        orders:order_id(id, order_code),
        invoice_items(id, line_item, quantity, unit_price, tax_amount, total_price)
      `)
      .order('issue_date', { ascending: false });

    if (invErr) {
      return jsonError('Failed to fetch invoices: ' + invErr.message, 500);
    }

    const allInvoices = invoices || [];
    let totalInvoicedAmount = 0;
    let totalOutstandingInvoices = 0;
    const invoiceStatusDistribution = {};
    const outstandingInvoicesList = [];

    allInvoices.forEach((inv) => {
      let invTotal = 0;
      (inv.invoice_items || []).forEach((item) => {
        invTotal += (parseFloat(item.total_price) || 0) + (parseFloat(item.tax_amount) || 0);
      });

      const st = inv.status || 'draft';
      invoiceStatusDistribution[st] = (invoiceStatusDistribution[st] || 0) + 1;

      if (st !== 'cancelled') {
        totalInvoicedAmount += invTotal;
      }

      if (['issued', 'sent', 'partially_paid', 'overdue'].includes(st)) {
        totalOutstandingInvoices += invTotal;
        outstandingInvoicesList.push({
          ...inv,
          calculated_total: invTotal
        });
      }
    });

    // 4. Fetch Expenses
    const { data: expenses, error: expErr } = await adminClient
      .from('expenses')
      .select('id, expense_code, category, description, amount, incurred_date, created_at')
      .order('incurred_date', { ascending: false });

    if (expErr) {
      return jsonError('Failed to fetch expenses: ' + expErr.message, 500);
    }

    const allExpenses = expenses || [];
    let totalRecordedExpenses = 0;
    const expenseCategoryBreakdown = {};

    allExpenses.forEach((e) => {
      const amt = parseFloat(e.amount) || 0;
      totalRecordedExpenses += amt;
      const cat = e.category || 'other';
      expenseCategoryBreakdown[cat] = (expenseCategoryBreakdown[cat] || 0) + amt;
    });

    // 5. Fetch Project Costs
    const { data: projectCosts, error: pcErr } = await adminClient
      .from('project_costs')
      .select('id, order_id, cost_category, amount, incurred_date');

    const allProjectCosts = projectCosts || [];
    let totalProjectCosts = 0;
    allProjectCosts.forEach((pc) => {
      totalProjectCosts += parseFloat(pc.amount) || 0;
    });

    // 6. Net Project Profitability
    // Gross Profit = Collected Revenue - Total Project Costs (or Expenses)
    const netProfit = netCollectedRevenue - (totalProjectCosts > 0 ? totalProjectCosts : totalRecordedExpenses);
    const profitMarginPct = netCollectedRevenue > 0
      ? ((netProfit / netCollectedRevenue) * 100).toFixed(1)
      : '0.0';

    // 7. Recent Transactions from financial_transactions
    const { data: txns } = await adminClient
      .from('financial_transactions')
      .select('id, transaction_code, transaction_type, amount, currency, transaction_date')
      .order('transaction_date', { ascending: false })
      .limit(8);

    // 8. Monthly Revenue and Expense Trends (Last 6 Months)
    const monthlyMap = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Add payments
    allPayments.forEach((p) => {
      if (p.paid_at && p.status !== 'failed') {
        const d = new Date(p.paid_at);
        const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
        if (!monthlyMap[key]) monthlyMap[key] = { month: key, revenue: 0, expenses: 0 };
        monthlyMap[key].revenue += parseFloat(p.amount) || 0;
      }
    });

    // Add expenses
    allExpenses.forEach((e) => {
      if (e.incurred_date) {
        const d = new Date(e.incurred_date);
        const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
        if (!monthlyMap[key]) monthlyMap[key] = { month: key, revenue: 0, expenses: 0 };
        monthlyMap[key].expenses += parseFloat(e.amount) || 0;
      }
    });

    const monthlyTrends = Object.values(monthlyMap);

    return jsonResponse({
      metrics: {
        totalOrderValue,
        totalInvoicedAmount,
        totalCollectedPayments: netCollectedRevenue,
        pendingBalance: totalPendingBalance,
        outstandingInvoices: totalOutstandingInvoices,
        totalRecordedExpenses,
        totalProjectCosts,
        netProfit,
        profitMarginPct: parseFloat(profitMarginPct)
      },
      paymentStatusDistribution,
      paymentMethodDistribution,
      invoiceStatusDistribution,
      expenseCategoryBreakdown,
      outstandingInvoices: outstandingInvoicesList.slice(0, 5),
      recentTransactions: txns || [],
      recentPayments: allPayments.slice(0, 6),
      monthlyTrends
    });
  } catch (error) {
    return jsonError('Server error generating finance dashboard: ' + error.message, 500);
  }
}
