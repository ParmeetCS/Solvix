import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireFinanceOrAdmin, logFinanceActivity } from '@/lib/supabase/financeAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/finance/project-costs
 * Returns project profitability calculations for all solar installation projects/orders:
 * 1. Order Contract Revenue vs Invoiced Amount vs Collected Payments
 * 2. Breakdown of Equipment, Labour, Logistics, Permits, and Other Costs
 * 3. Gross Profit (Revenue - Total Cost)
 * 4. Profit Margin %
 * 5. Identifies incomplete cost records where critical categories have not yet been logged.
 */
export async function GET(request) {
  try {
    const authResult = await requireFinanceOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;
    const { searchParams } = new URL(request.url);
    const order_id = searchParams.get('order_id');

    // 1. Fetch Orders with Customer details
    let orderQuery = adminClient
      .from('orders')
      .select(`
        id,
        order_code,
        status,
        total_amount,
        advance_paid,
        balance_due,
        payment_status,
        created_at,
        customer_id,
        customers:customer_id(id, customer_code, contact_name, phone, email)
      `)
      .order('created_at', { ascending: false });

    if (order_id) {
      orderQuery = orderQuery.eq('id', order_id);
    }

    const { data: orders, error: ordersErr } = await orderQuery;
    if (ordersErr) {
      return jsonError('Database error fetching orders: ' + ordersErr.message, 500);
    }

    const allOrders = orders || [];
    const orderIds = allOrders.map((o) => o.id);

    // 2. Fetch all project_costs for these orders
    let costsByOrder = {};
    if (orderIds.length > 0) {
      const { data: costs } = await adminClient
        .from('project_costs')
        .select('id, order_id, cost_category, amount, incurred_date, notes')
        .in('order_id', orderIds);

      (costs || []).forEach((c) => {
        if (!costsByOrder[c.order_id]) costsByOrder[c.order_id] = [];
        costsByOrder[c.order_id].push(c);
      });
    }

    // 3. Fetch all verified payments for these orders
    let paymentsByOrder = {};
    if (orderIds.length > 0) {
      const { data: pmts } = await adminClient
        .from('payments')
        .select('order_id, amount, status')
        .in('order_id', orderIds);

      (pmts || []).forEach((p) => {
        if (p.status === 'verified' || p.status === 'recorded') {
          paymentsByOrder[p.order_id] = (paymentsByOrder[p.order_id] || 0) + (parseFloat(p.amount) || 0);
        }
      });
    }

    // 4. Fetch all invoices for these orders
    let invoicesByOrder = {};
    if (orderIds.length > 0) {
      const { data: invs } = await adminClient
        .from('invoices')
        .select(`
          order_id,
          status,
          invoice_items(total_price, tax_amount)
        `)
        .in('order_id', orderIds);

      (invs || []).forEach((inv) => {
        if (inv.status !== 'cancelled') {
          let t = 0;
          (inv.invoice_items || []).forEach((item) => {
            t += (parseFloat(item.total_price) || 0) + (parseFloat(item.tax_amount) || 0);
          });
          invoicesByOrder[inv.order_id] = (invoicesByOrder[inv.order_id] || 0) + t;
        }
      });
    }

    // Compute project profitability records
    const profitabilityRecords = allOrders.map((ord) => {
      const orderRevenue = parseFloat(ord.total_amount) || 0;
      const invoicedAmount = invoicesByOrder[ord.id] || 0;
      const collectedPayment = paymentsByOrder[ord.id] || (parseFloat(ord.advance_paid) || 0);
      const outstandingBalance = Math.max(0, orderRevenue - collectedPayment);

      const costsList = costsByOrder[ord.id] || [];
      const costBreakdown = {
        equipment: 0,
        labour: 0,
        logistics: 0,
        permits: 0,
        other: 0
      };

      let totalProjectCost = 0;
      costsList.forEach((c) => {
        const amt = parseFloat(c.amount) || 0;
        totalProjectCost += amt;
        const cat = c.cost_category || 'other';
        if (costBreakdown[cat] !== undefined) {
          costBreakdown[cat] += amt;
        } else {
          costBreakdown.other += amt;
        }
      });

      // Profit calculations:
      // Gross Profit based on Contract Order Value
      const grossProfitContract = orderRevenue - totalProjectCost;
      const profitMarginContract = orderRevenue > 0
        ? ((grossProfitContract / orderRevenue) * 100).toFixed(1)
        : '0.0';

      // Realized Profit based on actual Collected Payments
      const realizedProfit = collectedPayment - totalProjectCost;
      const realizedMargin = collectedPayment > 0
        ? ((realizedProfit / collectedPayment) * 100).toFixed(1)
        : '0.0';

      // Check completeness: Are equipment and labour costs recorded?
      const missingCategories = [];
      if (costBreakdown.equipment === 0) missingCategories.push('equipment');
      if (costBreakdown.labour === 0) missingCategories.push('labour');
      if (costBreakdown.logistics === 0) missingCategories.push('logistics');

      const isCostRecordComplete = costsList.length > 0 && missingCategories.length === 0;

      return {
        order_id: ord.id,
        order_code: ord.order_code,
        customer: ord.customers,
        status: ord.status,
        financials: {
          order_revenue: orderRevenue,
          invoiced_amount: invoicedAmount,
          collected_payment: collectedPayment,
          outstanding_balance: outstandingBalance
        },
        costs: {
          total: totalProjectCost,
          breakdown: costBreakdown,
          item_count: costsList.length,
          items: costsList
        },
        profitability: {
          gross_profit: grossProfitContract,
          profit_margin_pct: parseFloat(profitMarginContract),
          realized_profit: realizedProfit,
          realized_margin_pct: parseFloat(realizedMargin),
          is_complete: isCostRecordComplete,
          missing_cost_categories: missingCategories,
          warning: !isCostRecordComplete ? `Incomplete cost record: Missing ${missingCategories.join(', ')} expense entries. Margin is preliminary.` : null
        }
      };
    });

    return jsonResponse({
      calculation_method: 'Gross Profit = Order Revenue - Recorded Project Costs (Equipment + Labour + Logistics + Permits + Other). Realized Profit calculated against verified collected payments.',
      projects: profitabilityRecords
    });
  } catch (error) {
    return jsonError('Server error calculating project costs: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/finance/project-costs
 * Records an itemized project cost against an order.
 */
export async function POST(request) {
  try {
    const authResult = await requireFinanceOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json().catch(() => ({}));

    const {
      order_id,
      cost_category = 'equipment', // 'equipment' | 'labour' | 'logistics' | 'permits' | 'other'
      amount,
      incurred_date = new Date().toISOString().split('T')[0],
      notes = ''
    } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return jsonError('A valid positive amount is required.', 400);
    }

    if (!order_id) {
      return jsonError('order_id is required.', 400);
    }

    const validCategories = ['equipment', 'labour', 'logistics', 'permits', 'other'];
    let safeCategory = cost_category.toLowerCase();
    if (!validCategories.includes(safeCategory)) safeCategory = 'other';

    const { data: newCost, error: insertErr } = await adminClient
      .from('project_costs')
      .insert({
        order_id,
        cost_category: safeCategory,
        amount: numAmount,
        incurred_date,
        notes: notes.trim()
      })
      .select('*')
      .single();

    if (insertErr) {
      return jsonError('Failed to record project cost: ' + insertErr.message, 500);
    }

    await logFinanceActivity({
      actorId: profile.id,
      action: 'PROJECT_COST_RECORDED',
      entityType: 'project_cost',
      entityId: newCost.id,
      metadata: { order_id, cost_category: safeCategory, amount: numAmount }
    });

    return jsonResponse(newCost, { message: 'Project cost recorded successfully.', status: 201 });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
