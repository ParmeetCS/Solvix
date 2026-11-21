import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/sales/leads/[id]/assign
 * Assigns or reassigns a lead to an employee and records it in lead_assignments.
 * Only Admins or Sales Managers can assign leads.
 */
export async function POST(request, { params }) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isAdmin, adminClient } = authResult;
    const { id } = await params;
    const body = await request.json();

    const { assigned_to, notes = '' } = body;
    if (!assigned_to) {
      return jsonError('Target employee assigned_to (UUID) is required.', 400);
    }

    // Verify target employee exists
    const { data: targetProfile, error: targetError } = await adminClient
      .from('profiles')
      .select('id, full_name, email, is_active')
      .eq('id', assigned_to)
      .single();

    if (targetError || !targetProfile || !targetProfile.is_active) {
      return jsonError('Target employee not found or inactive.', 400);
    }

    // Fetch existing lead
    const { data: existingLead, error: leadError } = await adminClient
      .from('leads')
      .select('id, lead_code, assigned_to, customer_name')
      .eq('id', id)
      .single();

    if (leadError || !existingLead) {
      return jsonError('Lead not found.', 404);
    }

    // Non-admin can only reassign if lead is currently assigned to them or if they are admin
    if (!isAdmin && existingLead.assigned_to !== profile.id) {
      return jsonError('Only Admins or the currently assigned employee can reassign this lead.', 403);
    }

    // 1. Mark previous active assignment inactive
    await adminClient
      .from('lead_assignments')
      .update({ is_active: false })
      .eq('lead_id', id);

    // 2. Insert new assignment record
    const { data: assignmentRecord, error: assignError } = await adminClient
      .from('lead_assignments')
      .insert({
        lead_id: id,
        assigned_to: assigned_to,
        assigned_by: profile.id,
        is_active: true,
        notes: notes || `Assigned to ${targetProfile.full_name || targetProfile.email}`
      })
      .select('*')
      .single();

    if (assignError) {
      return jsonError('Failed to record assignment: ' + assignError.message, 500);
    }

    // 3. Update lead table assigned_to and updated_at
    const { data: updatedLead, error: leadUpdateError } = await adminClient
      .from('leads')
      .update({
        assigned_to: assigned_to,
        updated_at: new Date().toISOString(),
        updated_by: profile.id
      })
      .eq('id', id)
      .select('*, assigned_profile:assigned_to ( id, full_name, email )')
      .single();

    if (leadUpdateError) {
      return jsonError('Failed to update lead: ' + leadUpdateError.message, 500);
    }

    // 4. Log activity
    await logActivity({
      actorId: profile.id,
      action: 'LEAD_REASSIGNED',
      entityType: 'lead',
      entityId: id,
      metadata: {
        previous_assigned_to: existingLead.assigned_to,
        new_assigned_to: assigned_to,
        assigned_to_name: targetProfile.full_name,
        notes
      }
    });

    return jsonResponse({
      lead: updatedLead,
      assignment: assignmentRecord
    }, { message: `Lead successfully assigned to ${targetProfile.full_name || targetProfile.email}.` });
  } catch (error) {
    return jsonError('Server error assigning lead: ' + error.message, 500);
  }
}
