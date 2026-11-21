import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireCustomerOrSupportOrAdmin, logSupportActivity, sendNotification } from '@/lib/supabase/supportAuth';

export async function OPTIONS() {
  return handleOptions();
}

function generateClaimCode() {
  const yr = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CLM-${yr}-${rand}`;
}

/**
 * GET /api/v1/support/warranties/claims
 * Lists all warranty claims.
 */
export async function GET(request) {
  try {
    const authResult = await requireCustomerOrSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient, isCustomer, customerRecord } = authResult;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') || '';
    const claim_type = searchParams.get('claim_type') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = adminClient
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
        warranty_id,
        customer_id,
        reviewed_by,
        customers:customer_id ( id, customer_code, contact_name, email, phone ),
        profiles:reviewed_by ( id, full_name, email ),
        warranties:warranty_id (
          id,
          warranty_code,
          warranty_type,
          start_date,
          expiry_date,
          status,
          equipment_serial_numbers:equipment_serial_id (
            id,
            serial_number,
            products:product_id ( id, name, sku, warranty_years )
          )
        )
      `, { count: 'exact' });

    if (isCustomer) {
      if (!customerRecord) {
        return jsonResponse({ claims: [], total: 0, page, limit });
      }
      query = query.eq('customer_id', customerRecord.id);
    }

    if (status) {
      query = query.eq('status', status);
    }
    if (claim_type) {
      query = query.eq('claim_type', claim_type);
    }

    query = query
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: claims, count, error } = await query;
    if (error) {
      return jsonError('Database error fetching warranty claims: ' + error.message, 500);
    }

    return jsonResponse({
      claims: claims || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/support/warranties/claims
 * Submits a new warranty claim. Checks eligibility based on delivery start date and product term.
 */
export async function POST(request) {
  try {
    const authResult = await requireCustomerOrSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isCustomer, customerRecord, adminClient } = authResult;
    const body = await request.json().catch(() => ({}));

    let {
      warranty_id,
      customer_id,
      claim_type = 'repair', // 'repair' | 'replacement'
      description,
      evidence_notes = '',
      ticket_id = null
    } = body;

    if (isCustomer) {
      if (!customerRecord) {
        return jsonError('No customer record associated with account.', 400);
      }
      customer_id = customerRecord.id;
    }

    if (!warranty_id || !customer_id || !description) {
      return jsonError('warranty_id, customer_id, and description are required.', 400);
    }

    // Verify warranty exists and check expiry
    const { data: warranty, error: warError } = await adminClient
      .from('warranties')
      .select('id, warranty_code, expiry_date, status, equipment_serial_id, customer_id')
      .eq('id', warranty_id)
      .single();

    if (warError || !warranty) {
      return jsonError('Warranty record not found.', 404);
    }

    const today = new Date().toISOString().split('T')[0];
    const isExpired = warranty.expiry_date < today;

    if (isExpired) {
      return jsonError(`Cannot file claim: Warranty expired on ${warranty.expiry_date}. Claim rejected per warranty terms.`, 400);
    }

    const claimCode = generateClaimCode();

    let fullDescription = description.trim();
    if (evidence_notes) {
      fullDescription += `\n\n[Evidence & Diagnosis]: ${evidence_notes.trim()}`;
    }
    if (ticket_id) {
      fullDescription += `\n[Linked Ticket ID: ${ticket_id}]`;
    }

    const safeClaimType = claim_type === 'replacement' ? 'replacement' : 'repair';

    // Insert claim record
    const { data: newClaim, error: insertError } = await adminClient
      .from('warranty_claims')
      .insert({
        claim_code: claimCode,
        warranty_id,
        customer_id,
        claim_type: safeClaimType,
        description: fullDescription,
        status: 'submitted'
      })
      .select('*')
      .single();

    if (insertError) {
      return jsonError('Failed to record warranty claim: ' + insertError.message, 500);
    }

    // Record in warranty_history
    await adminClient.from('warranty_history').insert({
      warranty_id,
      claim_id: newClaim.id,
      action: 'CLAIM_SUBMITTED',
      performed_by: profile.id,
      notes: `Claim ${claimCode} submitted (${safeClaimType}). Description: ${description.substring(0, 150)}`
    });

    // Update warranty status to indicate active claim
    await adminClient
      .from('warranties')
      .update({ status: 'claim_under_review', updated_at: new Date().toISOString() })
      .eq('id', warranty_id);

    // If linked to a ticket, link warranty_claim_id on service_tickets
    if (ticket_id) {
      await adminClient
        .from('service_tickets')
        .update({ warranty_claim_id: newClaim.id, updated_at: new Date().toISOString() })
        .eq('id', ticket_id);
    }

    // Log activity
    await logSupportActivity({
      actorId: profile.id,
      action: 'WARRANTY_CLAIM_CREATED',
      entityType: 'warranty_claim',
      entityId: newClaim.id,
      metadata: { claim_code: claimCode, warranty_id, claim_type: safeClaimType }
    });

    return jsonResponse(newClaim, { message: 'Warranty claim submitted successfully.', status: 201 });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
