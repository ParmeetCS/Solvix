import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireCustomerOrSupportOrAdmin } from '@/lib/supabase/supportAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/support/serials
 * Searches equipment serial numbers for autocomplete and warranty lookups.
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

    let query = adminClient
      .from('equipment_serial_numbers')
      .select(`
        id,
        serial_number,
        status,
        warranty_start_date,
        warranty_expiry_date,
        customer_id,
        order_id,
        products:product_id ( id, name, sku, warranty_years ),
        customers:customer_id ( id, customer_code, contact_name, phone )
      `)
      .order('created_at', { ascending: false })
      .limit(30);

    if (isCustomer && customerRecord) {
      query = query.eq('customer_id', customerRecord.id);
    }

    if (search) {
      query = query.ilike('serial_number', `%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: serials, error } = await query;
    if (error) {
      return jsonError('Database error fetching serials: ' + error.message, 500);
    }

    return jsonResponse({ serials: serials || [] });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
