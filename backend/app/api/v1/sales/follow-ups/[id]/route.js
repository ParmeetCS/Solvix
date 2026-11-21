import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * PATCH /api/v1/sales/follow-ups/[id]
 * Updates follow-up status (e.g. mark completed with outcome, or reschedule).
 */
export async function PATCH(request, { params }) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isAdmin, adminClient } = authResult;
    const { id } = await params;
    const body = await request.json();

    const {
      status, // 'completed', 'missed', 'rescheduled', 'pending'
      outcome,
      notes,
      rescheduled_at
    } = body;

    const { data: followUp, error: fetchError } = await adminClient
      .from('follow_ups')
      .select('*, lead:lead_id ( id, assigned_to )')
      .eq('id', id)
      .single();

    if (fetchError || !followUp) {
      return jsonError('Follow-up not found.', 404);
    }

    if (!isAdmin && followUp.lead?.assigned_to !== profile.id && followUp.created_by !== profile.id) {
      return jsonError('Access denied to update this follow-up.', 403);
    }

    const updatePayload = { updated_at: new Date().toISOString() };

    if (status) updatePayload.status = status;
    if (outcome !== undefined) updatePayload.outcome = outcome;
    if (notes !== undefined) updatePayload.notes = notes;

    if (status === 'completed') {
      updatePayload.completed_at = new Date().toISOString();
    }

    // Reschedule: update current to rescheduled and optionally schedule a new one
    if (rescheduled_at) {
      updatePayload.scheduled_at = rescheduled_at;
      updatePayload.status = 'rescheduled';
    }

    const { data: updatedFollowUp, error: updateError } = await adminClient
      .from('follow_ups')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return jsonError('Error updating follow-up: ' + updateError.message, 500);
    }

    // If completed, optionally record an interaction in customer_interactions
    if (status === 'completed' && outcome) {
      await adminClient.from('customer_interactions').insert({
        lead_id: followUp.lead_id,
        interaction_type: followUp.follow_up_type === 'whatsapp' ? 'whatsapp' : (followUp.follow_up_type === 'meeting' ? 'meeting' : 'call'),
        subject: `Follow-up Completed: ${followUp.follow_up_type}`,
        summary: `Outcome: ${outcome}. Notes: ${notes || followUp.notes || 'None'}`,
        created_by: profile.id
      });
    }

    await logActivity({
      actorId: profile.id,
      action: 'FOLLOW_UP_UPDATED',
      entityType: 'follow_up',
      entityId: id,
      metadata: { status, outcome, rescheduled_at }
    });

    return jsonResponse(updatedFollowUp, { message: 'Follow-up updated successfully.' });
  } catch (error) {
    return jsonError('Server error updating follow-up: ' + error.message, 500);
  }
}
