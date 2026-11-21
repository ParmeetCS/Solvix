import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireCustomer } from '@/lib/supabase/roles';
import { CUSTOMER_VISIBLE_QUOTATION_STATUSES } from '@/lib/quotation/data';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/customer/quotations
 * A customer can only ever see quotations linked to their own customer record.
 */
export async function GET(request) {
  try {
    const auth = await requireCustomer(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    let query = auth.adminClient
      .from('quotations')
      .select(`
        id, quotation_code, system_type, system_capacity_kw, total_amount,
        status, validity_date, created_at, sent_at, accepted_at, rejected_at,
        order:orders ( id, order_code, status, payment_status, total_amount, balance_due )
      `, { count: 'exact' })
      .eq('customer_id', auth.customer.id)
      .in('status', CUSTOMER_VISIBLE_QUOTATION_STATUSES)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      // A customer may filter by an issued status, but never request internal
      // draft/review states. Unknown or internal statuses yield no results.
      if (!CUSTOMER_VISIBLE_QUOTATION_STATUSES.includes(status)) {
        return jsonResponse({
          quotations: [],
          pagination: { total: 0, page, limit, totalPages: 0 },
        });
      }
      query = query.eq('status', status);
    }

    query = query.range(offset, offset + limit - 1);
    const { data, count, error } = await query;
    if (error) return jsonError('Failed to load your quotations: ' + error.message, 500);

    return jsonResponse({
      quotations: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return jsonError(error.message || 'Failed to load your quotations.', error.status || 500);
  }
}
