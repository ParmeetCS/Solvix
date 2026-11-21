import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/sales/customers/[id]
 * Retrieves full 360-degree customer details: addresses, leads, quotations, orders, interactions.
 */
export async function GET(request, { params }) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;
    const { id } = await params;

    const { data: customer, error: custError } = await adminClient
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (custError || !customer) {
      return jsonError('Customer not found.', 404);
    }

    // Parallel fetch: addresses, leads, quotations, orders, interactions
    const [addrRes, leadsRes, quotesRes, ordersRes, interactionsRes] = await Promise.all([
      adminClient.from('customer_addresses').select('*').eq('customer_id', id),
      adminClient.from('leads').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      adminClient.from('quotations').select('id, quotation_code, system_type, system_capacity_kw, total_amount, status, created_at').eq('customer_id', id).order('created_at', { ascending: false }),
      adminClient.from('orders').select('id, order_code, status, total_amount, balance_due, created_at').eq('customer_id', id).order('created_at', { ascending: false }),
      adminClient.from('customer_interactions').select('*, author:created_by ( full_name, email )').eq('customer_id', id).order('occurred_at', { ascending: false })
    ]);

    return jsonResponse({
      customer,
      addresses: addrRes.data || [],
      leads: leadsRes.data || [],
      quotations: quotesRes.data || [],
      orders: ordersRes.data || [],
      interactions: interactionsRes.data || []
    });
  } catch (error) {
    return jsonError('Server error fetching customer details: ' + error.message, 500);
  }
}
