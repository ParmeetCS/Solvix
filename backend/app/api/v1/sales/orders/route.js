import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/** GET /api/v1/sales/orders — scoped order list. */
export async function GET(request) {
  try {
    const auth = await requireSalesOrAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { profile, isAdmin, adminClient } = auth;
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status') || '';
    const paymentStatus = searchParams.get('payment_status') || '';
    const customerId = searchParams.get('customer_id') || '';
    const warehouseReady = searchParams.get('warehouse_ready') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    let query = adminClient
      .from('orders')
      .select(`
        *,
        customer:customer_id ( id, customer_code, contact_name, company_name, email, phone ),
        quotation:quotation_id ( id, quotation_code, status, system_type, system_capacity_kw ),
        created_by_profile:created_by ( id, full_name, email )
      `, { count: 'exact' });

    if (!isAdmin) query = query.eq('created_by', profile.id);
    if (status && status !== 'all') query = query.eq('status', status);
    if (paymentStatus && paymentStatus !== 'all') query = query.eq('payment_status', paymentStatus);
    if (customerId) query = query.eq('customer_id', customerId);
    if (warehouseReady) query = query.not('warehouse_handoff_at', 'is', null);

    if (search) {
      const { data: matchingCustomers } = await adminClient
        .from('customers')
        .select('id')
        .or(`contact_name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,customer_code.ilike.%${search}%`)
        .limit(100);
      const ids = (matchingCustomers || []).map((row) => row.id);
      if (ids.length > 0) {
        query = query.or(
          `order_code.ilike.%${search}%,quotation_code.ilike.%${search}%,customer_id.in.(${ids.join(',')})`
        );
      } else {
        query = query.or(`order_code.ilike.%${search}%,quotation_code.ilike.%${search}%`);
      }
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    const { data, count, error } = await query;
    if (error) return jsonError('Failed to fetch orders: ' + error.message, 500);

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
    return jsonError(error.message || 'Failed to fetch orders.', error.status || 500);
  }
}
