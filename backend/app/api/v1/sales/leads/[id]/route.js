import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/sales/leads/[id]
 * Retrieves comprehensive lead details including assignments, follow-ups, and interactions.
 */
export async function GET(request, { params }) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isAdmin, adminClient } = authResult;
    const { id } = await params;

    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .select(`
        *,
        assigned_profile:assigned_to ( id, full_name, email, phone ),
        created_profile:created_by ( id, full_name, email ),
        customer:customer_id ( id, customer_code, contact_name, phone, email )
      `)
      .eq('id', id)
      .single();

    if (leadError || !lead) {
      return jsonError('Lead not found.', 404);
    }

    // RBAC check: Non-admins can only view their own assigned leads
    if (!isAdmin && lead.assigned_to !== profile.id && lead.created_by !== profile.id) {
      return jsonError('Access denied to this lead.', 403);
    }

    // Parallel fetch: assignment history, follow-ups, interactions, surveys
    const [assignmentsRes, followUpsRes, interactionsRes, surveysRes] = await Promise.all([
      adminClient
        .from('lead_assignments')
        .select(`
          id, assigned_at, notes, is_active,
          assigned_to_profile:assigned_to ( id, full_name, email ),
          assigned_by_profile:assigned_by ( id, full_name, email )
        `)
        .eq('lead_id', id)
        .order('assigned_at', { ascending: false }),

      adminClient
        .from('follow_ups')
        .select('*')
        .eq('lead_id', id)
        .order('scheduled_at', { ascending: false }),

      adminClient
        .from('customer_interactions')
        .select(`
          id, interaction_type, subject, summary, occurred_at,
          author:created_by ( id, full_name, email )
        `)
        .eq('lead_id', id)
        .order('occurred_at', { ascending: false }),

      adminClient
        .from('site_surveys')
        .select('id, survey_code, feasibility_status, survey_date, created_at')
        .eq('lead_id', id)
        .order('created_at', { ascending: false })
    ]);

    return jsonResponse({
      lead,
      assignments: assignmentsRes.data || [],
      followUps: followUpsRes.data || [],
      interactions: interactionsRes.data || [],
      surveys: surveysRes.data || []
    });
  } catch (error) {
    return jsonError('Failed to fetch lead details: ' + error.message, 500);
  }
}

/**
 * PATCH /api/v1/sales/leads/[id]
 * Updates lead fields, status, notes, or records lost reasons.
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

    // Verify lead exists and user has permission
    const { data: existingLead, error: findError } = await adminClient
      .from('leads')
      .select('id, assigned_to, created_by, status, lead_code, customer_name')
      .eq('id', id)
      .single();

    if (findError || !existingLead) {
      return jsonError('Lead not found.', 404);
    }

    if (!isAdmin && existingLead.assigned_to !== profile.id && existingLead.created_by !== profile.id) {
      return jsonError('Access denied. You can only update leads assigned to you.', 403);
    }

    const allowedFields = [
      'customer_name', 'phone', 'email', 'address', 'source', 'system_type',
      'expected_capacity_kw', 'monthly_electricity_bill', 'additional_requirements',
      'priority', 'notes', 'estimated_value', 'status', 'lost_reason', 'expected_close_date'
    ];

    const updatePayload = { updated_by: profile.id, updated_at: new Date().toISOString() };
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updatePayload[key] = body[key];
      }
    }

    // If status changed to lost, require or ensure lost_reason
    if (body.status === 'lost' && !body.lost_reason && !existingLead.lost_reason) {
      updatePayload.lost_reason = body.lost_reason || 'No specific reason specified';
    }

    const { data: updatedLead, error: updateError } = await adminClient
      .from('leads')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return jsonError('Error updating lead: ' + updateError.message, 500);
    }

    // Log status change or general update
    if (body.status && body.status !== existingLead.status) {
      await logActivity({
        actorId: profile.id,
        action: 'LEAD_STATUS_CHANGED',
        entityType: 'lead',
        entityId: id,
        metadata: {
          previous_status: existingLead.status,
          new_status: body.status,
          lost_reason: body.lost_reason || null
        }
      });
    } else {
      await logActivity({
        actorId: profile.id,
        action: 'LEAD_UPDATED',
        entityType: 'lead',
        entityId: id,
        metadata: { updated_fields: Object.keys(body) }
      });
    }

    return jsonResponse(updatedLead, { message: 'Lead updated successfully.' });
  } catch (error) {
    return jsonError('Failed to update lead: ' + error.message, 500);
  }
}
