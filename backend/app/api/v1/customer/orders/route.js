import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireCustomer } from '@/lib/supabase/roles';

export async function OPTIONS() {
  return handleOptions();
}

/** GET /api/v1/customer/orders — scoped to the authenticated customer. */
export async function GET(request) {
  try {
    const auth = await requireCustomer(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const { data, count, error } = await auth.adminClient
      .from('orders')
      .select(`
        id, order_code, status, payment_status, total_amount, advance_paid,
        balance_due, system_type, system_capacity_kw, created_at,
        quotation:quotation_id ( id, quotation_code )
      `, { count: 'exact' })
      .eq('customer_id', auth.customer.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return jsonError('Failed to load your orders: ' + error.message, 500);

    return jsonResponse({
      orders: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return jsonError(error.message || 'Failed to load your orders.', error.status || 500);
  }
}
