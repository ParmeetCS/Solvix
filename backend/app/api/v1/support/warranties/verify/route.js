import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireCustomerOrSupportOrAdmin } from '@/lib/supabase/supportAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/support/warranties/verify
 * CRITICAL RULE: Warranty starts from equipment delivery date, not installation completion date.
 * Verifies warranty directly against real database records:
 * 1. Finds serial number in equipment_serial_numbers.
 * 2. Finds equipment_deliveries milestone for the order/dispatch.
 * 3. Finds product warranty configuration from products table.
 * 4. Checks against existing warranties table.
 */
export async function POST(request) {
  try {
    const authResult = await requireCustomerOrSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;
    const body = await request.json().catch(() => ({}));
    const serialNumber = (body.serial_number || '').trim();

    if (!serialNumber) {
      return jsonError('serial_number is required for warranty verification.', 400);
    }

    // 1. Query equipment_serial_numbers
    const { data: serialRecord, error: serialError } = await adminClient
      .from('equipment_serial_numbers')
      .select(`
        id,
        serial_number,
        status,
        warranty_start_date,
        warranty_expiry_date,
        customer_id,
        order_id,
        customers:customer_id ( id, customer_code, contact_name, email, phone ),
        products:product_id ( id, name, sku, warranty_years, description )
      `)
      .ilike('serial_number', serialNumber)
      .maybeSingle();

    if (serialError) {
      return jsonError('Database error looking up serial: ' + serialError.message, 500);
    }

    if (!serialRecord) {
      return jsonResponse({
        found: false,
        serial_number: serialNumber,
        message: 'No equipment found matching this serial number in the Solvix registry.'
      });
    }

    // 2. Query delivery record for this customer / order / dispatch
    // CRITICAL: Warranty starts from equipment delivery date!
    let deliveryRecord = null;
    if (serialRecord.order_id) {
      const { data: dispatches } = await adminClient
        .from('dispatches')
        .select(`
          id,
          equipment_deliveries (
            id,
            delivered_at,
            proof_of_delivery_storage_path,
            notes
          )
        `)
        .eq('order_id', serialRecord.order_id);

      if (dispatches && dispatches.length > 0) {
        for (const d of dispatches) {
          if (d.equipment_deliveries && d.equipment_deliveries.length > 0) {
            deliveryRecord = d.equipment_deliveries[0];
            break;
          }
        }
      }
    }

    // Fallback: direct delivery lookup by customer
    if (!deliveryRecord && serialRecord.customer_id) {
      const { data: directDelivery } = await adminClient
        .from('equipment_deliveries')
        .select('id, delivered_at, notes')
        .eq('customer_id', serialRecord.customer_id)
        .order('delivered_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (directDelivery) deliveryRecord = directDelivery;
    }

    // 3. Query existing warranty record
    const { data: existingWarranty } = await adminClient
      .from('warranties')
      .select('*')
      .eq('equipment_serial_id', serialRecord.id)
      .maybeSingle();

    // 4. Calculate start and expiry dates based on delivery date and configured product terms
    const productWarrantyYears = serialRecord.products?.warranty_years || 5;
    
    // Start date is strictly the equipment delivery date
    let startDateStr = null;
    if (deliveryRecord?.delivered_at) {
      startDateStr = new Date(deliveryRecord.delivered_at).toISOString().split('T')[0];
    } else if (existingWarranty?.start_date) {
      startDateStr = existingWarranty.start_date;
    } else if (serialRecord.warranty_start_date) {
      startDateStr = serialRecord.warranty_start_date;
    }

    let expiryDateStr = null;
    let isExpired = false;
    let computedStatus = 'pending_activation';

    if (startDateStr) {
      const startD = new Date(startDateStr);
      const expiryD = new Date(startD);
      expiryD.setFullYear(expiryD.getFullYear() + Math.floor(productWarrantyYears));
      expiryDateStr = existingWarranty?.expiry_date || expiryD.toISOString().split('T')[0];

      const today = new Date().toISOString().split('T')[0];
      isExpired = expiryDateStr < today;
      computedStatus = isExpired ? 'expired' : (existingWarranty?.status || 'active');
    }

    return jsonResponse({
      found: true,
      serial_number: serialRecord.serial_number,
      serial_id: serialRecord.id,
      equipment_status: serialRecord.status,
      customer: serialRecord.customers,
      product: serialRecord.products,
      delivery: deliveryRecord
        ? {
            delivery_id: deliveryRecord.id,
            delivered_at: deliveryRecord.delivered_at,
            delivery_milestone_verified: true,
            notes: deliveryRecord.notes
          }
        : {
            delivery_milestone_verified: false,
            message: 'Equipment delivery confirmation is pending.'
          },
      warranty: existingWarranty || null,
      verification: {
        rule_applied: 'Warranty clock starts from equipment delivery date (not installation completion date).',
        warranty_duration_years: productWarrantyYears,
        start_date: startDateStr,
        expiry_date: expiryDateStr,
        is_active: computedStatus === 'active' && !isExpired,
        status: computedStatus,
        eligible_for_claim: computedStatus === 'active' && !isExpired
      }
    });
  } catch (error) {
    return jsonError('Server error during warranty verification: ' + error.message, 500);
  }
}
