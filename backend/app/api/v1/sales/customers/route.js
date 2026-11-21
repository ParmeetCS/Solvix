import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * Generate unique human-readable customer code (e.g. "CUST-2026-0081")
 */
function generateCustomerCode() {
  const yr = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CUST-${yr}-${rand}`;
}

/**
 * GET /api/v1/sales/customers
 * Lists customers with search and duplicate check.
 */
export async function GET(request) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const phone = searchParams.get('phone') || '';
    const email = searchParams.get('email') || '';

    let query = adminClient
      .from('customers')
      .select(`
        *,
        addresses:customer_addresses (*),
        leads ( id, lead_code, status, estimated_value )
      `)
      .order('created_at', { ascending: false });

    if (phone) {
      query = query.eq('phone', phone.trim());
    }
    if (email) {
      query = query.eq('email', email.trim());
    }
    if (search) {
      query = query.or(`contact_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,customer_code.ilike.%${search}%,company_name.ilike.%${search}%`);
    }

    const { data: customers, error } = await query.limit(50);
    if (error) {
      return jsonError('Failed to fetch customers: ' + error.message, 500);
    }

    return jsonResponse(customers || []);
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/sales/customers
 * Registers a new customer or links an existing one (preventing duplicates).
 */
export async function POST(request) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json();

    const {
      contact_name,
      phone,
      email,
      customer_type = 'residential',
      company_name,
      notes,
      street,
      city = 'City',
      state,
      postal_code,
      lead_id // optional: link and convert lead immediately
    } = body;

    if (!contact_name || !email) {
      return jsonError('contact_name and email are required for customer registration.', 400);
    }

    // Check duplicate customer by email or phone
    let dupQuery = adminClient
      .from('customers')
      .select('id, customer_code, contact_name, phone, email');

    if (phone && phone.trim()) {
      dupQuery = dupQuery.or(`email.eq.${email.trim()},phone.eq.${phone.trim()}`);
    } else {
      dupQuery = dupQuery.eq('email', email.trim());
    }

    const { data: existingCustomers } = await dupQuery;
    let customerRecord = null;

    if (existingCustomers && existingCustomers.length > 0) {
      // Re-use existing customer to prevent duplicates!
      customerRecord = existingCustomers[0];
    } else {
      // Create new customer
      const custCode = generateCustomerCode();
      const { data: newCustomer, error: insertError } = await adminClient
        .from('customers')
        .insert({
          customer_code: custCode,
          contact_name: contact_name.trim(),
          phone: phone ? phone.trim() : null,
          email: email.trim(),
          customer_type,
          company_name: company_name || null,
          notes: notes || null,
          status: 'active',
          created_by: profile.id,
          updated_by: profile.id
        })
        .select('*')
        .single();

      if (insertError) {
        return jsonError('Database error creating customer: ' + insertError.message, 500);
      }
      customerRecord = newCustomer;

      // Add address if provided
      if (street) {
        await adminClient.from('customer_addresses').insert({
          customer_id: customerRecord.id,
          street: street.trim(),
          city: city || 'City',
          state: state || null,
          postal_code: postal_code || null,
          is_primary: true
        });
      }
    }

    // If lead_id was provided, link lead to this customer and update status to converted
    if (lead_id) {
      await adminClient
        .from('leads')
        .update({
          customer_id: customerRecord.id,
          status: 'converted',
          updated_at: new Date().toISOString(),
          updated_by: profile.id
        })
        .eq('id', lead_id);

      await logActivity({
        actorId: profile.id,
        action: 'LEAD_CONVERTED_TO_CUSTOMER',
        entityType: 'lead',
        entityId: lead_id,
        metadata: { customer_id: customerRecord.id, customer_code: customerRecord.customer_code }
      });
    }

    await logActivity({
      actorId: profile.id,
      action: 'CUSTOMER_REGISTERED',
      entityType: 'customer',
      entityId: customerRecord.id,
      metadata: { customer_code: customerRecord.customer_code, contact_name, is_duplicate_reuse: !!(existingCustomers && existingCustomers.length > 0) }
    });

    return jsonResponse(customerRecord, {
      message: existingCustomers && existingCustomers.length > 0
        ? `Existing customer profile (${customerRecord.customer_code}) linked to prevent duplicates.`
        : 'Customer registered successfully.',
      status: 201
    });
  } catch (error) {
    return jsonError('Server error creating/linking customer: ' + error.message, 500);
  }
}
