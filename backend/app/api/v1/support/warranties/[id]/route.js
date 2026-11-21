import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireCustomerOrSupportOrAdmin } from '@/lib/supabase/supportAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/support/warranties/[id]
 */
export async function GET(request, { params }) {
  try {
    const authResult = await requireCustomerOrSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient, isCustomer, customerRecord } = authResult;
    const { id } = await params;

    const { data: warranty, error: warrantyError } = await adminClient
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
          current_location,
          products:product_id ( id, name, sku, warranty_years, description )
        ),
        orders:order_id ( id, order_code, status )
      `)
      .eq('id', id)
      .single();

    if (warrantyError || !warranty) {
      return jsonError('Warranty record not found.', 404);
    }

    if (isCustomer && customerRecord && warranty.customer_id !== customerRecord.id) {
      return jsonError('Access denied.', 403);
    }

    // Fetch claims history for this warranty
    const { data: claims } = await adminClient
      .from('warranty_claims')
      .select(`
        id,
        claim_code,
        claim_type,
        description,
        status,
        resolution,
        submitted_at,
        reviewed_at,
        profiles:reviewed_by ( id, full_name, email )
      `)
      .eq('warranty_id', id)
      .order('submitted_at', { ascending: false });

    // Fetch delivery verification record if customer has one
    let deliveryRecord = null;
    if (warranty.customer_id) {
      const { data: delivery } = await adminClient
        .from('equipment_deliveries')
        .select('id, delivered_at, notes, proof_of_delivery_storage_path')
        .eq('customer_id', warranty.customer_id)
        .order('delivered_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      deliveryRecord = delivery;
    }

    const today = new Date().toISOString().split('T')[0];
    const isExpired = warranty.expiry_date < today;

    return jsonResponse({
      warranty: {
        ...warranty,
        is_active: !isExpired && warranty.status === 'active',
        computed_status: isExpired ? 'expired' : warranty.status
      },
      claims: claims || [],
      delivery: deliveryRecord
    });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
