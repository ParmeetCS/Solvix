import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSupportOrAdmin, logSupportActivity, sendNotification } from '@/lib/supabase/supportAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/support/warranties/claims/[id]
 */
export async function GET(request, { params }) {
  try {
    const authResult = await requireSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;
    const { id } = await params;

    const { data: claim, error: claimError } = await adminClient
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
          terms,
          equipment_serial_numbers:equipment_serial_id (
            id,
            serial_number,
            status,
            products:product_id ( id, name, sku, warranty_years )
          )
        )
      `)
      .eq('id', id)
      .single();

    if (claimError || !claim) {
      return jsonError('Warranty claim not found.', 404);
    }

    // Fetch history
    const { data: history } = await adminClient
      .from('warranty_history')
      .select(`
        id,
        action,
        notes,
        performed_at,
        profiles:performed_by ( id, full_name, email )
      `)
      .eq('claim_id', id)
      .order('performed_at', { ascending: true });

    return jsonResponse({
      claim,
      history: history || []
    });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}

/**
 * PATCH /api/v1/support/warranties/claims/[id]
 * Approves or Rejects warranty claim with review reason and maintains history.
 * Authorized for Support specialists and Admins only.
 */
export async function PATCH(request, { params }) {
  try {
    const authResult = await requireSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { status, resolution = '', notes = '' } = body;

    const validStatuses = ['approved', 'rejected', 'under_review', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return jsonError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    if ((status === 'approved' || status === 'rejected') && !resolution.trim()) {
      return jsonError(`Resolution reason is required when ${status} a warranty claim.`, 400);
    }

    // Get claim
    const { data: claim, error: fetchError } = await adminClient
      .from('warranty_claims')
      .select('id, claim_code, warranty_id, customer_id, claim_type, status')
      .eq('id', id)
      .single();

    if (fetchError || !claim) {
      return jsonError('Claim not found.', 404);
    }

    const updatePayload = {
      status,
      resolution: resolution.trim(),
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: updatedClaim, error: updateError } = await adminClient
      .from('warranty_claims')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return jsonError('Failed to update warranty claim: ' + updateError.message, 500);
    }

    // Record action in warranty_history
    const actionName = status === 'approved' ? 'CLAIM_APPROVED' : (status === 'rejected' ? 'CLAIM_REJECTED' : 'CLAIM_REVIEW_UPDATED');
    await adminClient.from('warranty_history').insert({
      warranty_id: claim.warranty_id,
      claim_id: id,
      action: actionName,
      performed_by: profile.id,
      notes: `Claim ${claim.claim_code} set to ${status}. Decision: ${resolution.trim()} ${notes ? `(${notes.trim()})` : ''}`
    });

    // Update warranty status
    let newWarrantyStatus = 'active';
    if (status === 'approved') {
      newWarrantyStatus = claim.claim_type === 'replacement' ? 'claimed' : 'active';
    } else if (status === 'under_review') {
      newWarrantyStatus = 'claim_under_review';
    }
    await adminClient
      .from('warranties')
      .update({ status: newWarrantyStatus, updated_at: new Date().toISOString() })
      .eq('id', claim.warranty_id);

    // Notify customer
    const { data: customerProfile } = await adminClient
      .from('customers')
      .select('profile_id')
      .eq('id', claim.customer_id)
      .single();

    if (customerProfile?.profile_id) {
      await sendNotification({
        recipientId: customerProfile.profile_id,
        title: `Warranty Claim ${claim.claim_code} ${status.toUpperCase()}`,
        body: `Your warranty claim has been ${status}. Decision: ${resolution.trim().substring(0, 100)}`,
        type: status === 'approved' ? 'success' : 'alert',
        link: `/support/claims`
      });
    }

    // Log activity
    await logSupportActivity({
      actorId: profile.id,
      action: actionName,
      entityType: 'warranty_claim',
      entityId: id,
      metadata: { status, resolution }
    });

    return jsonResponse(updatedClaim, { message: `Claim ${claim.claim_code} ${status} successfully.` });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
