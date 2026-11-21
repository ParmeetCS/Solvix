import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireCustomerOrSupportOrAdmin } from '@/lib/supabase/supportAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/support/warranties
 * Queries real database records from the warranties table.
 */
export async function GET(request) {
  try {
    const authResult = await requireCustomerOrSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient, isCustomer, customerRecord } = authResult;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = adminClient
      .from('warranties')
      .select(`
        id,
        warranty_code,
        warranty_type,
        duration_years,
        start_date,
        expiry_date,
        status,
        terms,
        created_at,
        customer_id,
        equipment_serial_id,
        order_id,
        customers:customer_id ( id, customer_code, contact_name, email, phone ),
        equipment_serial_numbers:equipment_serial_id (
          id,
          serial_number,
          status,
          products:product_id ( id, name, sku, warranty_years )
        ),
        orders:order_id ( id, order_code, status )
      `, { count: 'exact' });

    if (isCustomer) {
      if (!customerRecord) {
        return jsonResponse({ warranties: [], total: 0, page, limit });
      }
      query = query.eq('customer_id', customerRecord.id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`warranty_code.ilike.%${search}%,terms.ilike.%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: warranties, count, error } = await query;
    if (error) {
      return jsonError('Database error fetching warranties: ' + error.message, 500);
    }

    // Compute live validity based on delivery date & expiry
    const today = new Date().toISOString().split('T')[0];
    const enriched = (warranties || []).map((w) => {
      const isExpired = w.expiry_date < today;
      return {
        ...w,
        is_active: !isExpired && w.status === 'active',
        computed_status: isExpired ? 'expired' : w.status
      };
    });

    return jsonResponse({
      warranties: enriched,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
