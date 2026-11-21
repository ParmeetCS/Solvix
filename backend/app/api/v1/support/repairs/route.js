import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSupportOrAdmin, logSupportActivity, sendNotification } from '@/lib/supabase/supportAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/support/repairs
 */
export async function GET(request) {
  try {
    const authResult = await requireSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;
    const { searchParams } = new URL(request.url);
    const ticket_id = searchParams.get('ticket_id');

    let query = adminClient
      .from('repair_assignments')
      .select(`
        id,
        ticket_id,
        technician_id,
        assigned_at,
        completed_at,
        repair_cost,
        is_warranty_covered,
        notes,
        service_tickets:ticket_id (
          id,
          ticket_code,
          subject,
          status,
          priority,
          customer_id,
          customers:customer_id ( id, contact_name, phone, email )
        ),
        technicians:technician_id (
          id,
          employee_code,
          skills,
          profiles:profile_id ( id, full_name, email, phone )
        )
      `)
      .order('assigned_at', { ascending: false });

    if (ticket_id) {
      query = query.eq('ticket_id', ticket_id);
    }

    const { data: repairs, error } = await query;
    if (error) {
      return jsonError('Database error fetching repairs: ' + error.message, 500);
    }

    return jsonResponse({ repairs: repairs || [] });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/support/repairs
 * Assigns a technician to investigate and perform repair.
 */
export async function POST(request) {
  try {
    const authResult = await requireSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json().catch(() => ({}));

    let {
      ticket_id,
      technician_id,
      profile_id,
      is_warranty_covered = false,
      repair_cost = 0,
      notes = ''
    } = body;

    if (!ticket_id) {
      return jsonError('ticket_id is required.', 400);
    }

    // Verify technician_id or find/create from profile_id
    if (!technician_id && profile_id) {
      let { data: tech } = await adminClient
        .from('technicians')
        .select('id')
        .eq('profile_id', profile_id)
        .maybeSingle();

      if (!tech) {
        // Create technician profile mapping
        const randCode = 'TECH-' + Math.floor(1000 + Math.random() * 9000);
        const { data: createdTech } = await adminClient
          .from('technicians')
          .insert({
            profile_id,
            employee_code: randCode,
            is_available: true
          })
          .select('id')
          .single();
        technician_id = createdTech?.id;
      } else {
        technician_id = tech.id;
      }
    }

    if (!technician_id) {
      // Find any existing technician or create for current profile
      const { data: anyTech } = await adminClient.from('technicians').select('id').limit(1).maybeSingle();
      if (anyTech) {
        technician_id = anyTech.id;
      } else {
        const randCode = 'TECH-' + Math.floor(1000 + Math.random() * 9000);
        const { data: createdTech } = await adminClient
          .from('technicians')
          .insert({
            profile_id: profile.id,
            employee_code: randCode,
            is_available: true
          })
          .select('id')
          .single();
        technician_id = createdTech?.id;
      }
    }

    // Insert repair assignment
    const { data: repair, error: insertError } = await adminClient
      .from('repair_assignments')
      .insert({
        ticket_id,
        technician_id,
        is_warranty_covered: Boolean(is_warranty_covered),
        repair_cost: parseFloat(repair_cost) || 0,
        notes: notes.trim()
      })
      .select('*')
      .single();

    if (insertError) {
      return jsonError('Failed to create repair assignment: ' + insertError.message, 500);
    }

    // Update ticket status to in_progress
    await adminClient
      .from('service_tickets')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', ticket_id);

    // Record in ticket updates
    await adminClient.from('service_ticket_updates').insert({
      ticket_id,
      update_text: `Technician assigned for on-site investigation and repair. Covered under warranty: ${is_warranty_covered ? 'YES' : 'NO'}. ${notes ? `Instructions: ${notes}` : ''}`,
      status: 'in_progress',
      updated_by: profile.id
    });

    // Log activity
    await logSupportActivity({
      actorId: profile.id,
      action: 'REPAIR_ASSIGNED',
      entityType: 'repair_assignment',
      entityId: repair.id,
      metadata: { ticket_id, technician_id, is_warranty_covered }
    });

    return jsonResponse(repair, { message: 'Repair assignment created successfully.', status: 201 });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}

/**
 * PATCH /api/v1/support/repairs
 * Updates repair assignment with investigation findings, repair actions, and outcome.
 */
export async function PATCH(request) {
  try {
    const authResult = await requireSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json().catch(() => ({}));

    const {
      id,
      findings = '',
      repair_actions = '',
      outcome = 'completed', // 'completed' | 'parts_required' | 'unrepairable'
      repair_cost = null,
      notes = '',
      resolve_ticket = true
    } = body;

    if (!id) {
      return jsonError('Repair assignment id is required.', 400);
    }

    // Fetch existing repair
    const { data: existingRepair, error: fetchError } = await adminClient
      .from('repair_assignments')
      .select('id, ticket_id, technician_id, notes')
      .eq('id', id)
      .single();

    if (fetchError || !existingRepair) {
      return jsonError('Repair assignment not found.', 404);
    }

    const timestamp = new Date().toISOString();
    let updatedNotes = existingRepair.notes || '';
    if (findings) updatedNotes += `\n[Findings]: ${findings.trim()}`;
    if (repair_actions) updatedNotes += `\n[Actions]: ${repair_actions.trim()}`;
    if (outcome) updatedNotes += `\n[Outcome]: ${outcome.trim()}`;
    if (notes) updatedNotes += `\n[Notes]: ${notes.trim()}`;

    const updatePayload = {
      completed_at: timestamp,
      notes: updatedNotes
    };
    if (repair_cost !== null) {
      updatePayload.repair_cost = parseFloat(repair_cost) || 0;
    }

    const { data: updatedRepair, error: updateError } = await adminClient
      .from('repair_assignments')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return jsonError('Failed to record repair outcome: ' + updateError.message, 500);
    }

    // If resolve_ticket and outcome is completed, mark ticket resolved
    if (resolve_ticket && outcome === 'completed') {
      await adminClient
        .from('service_tickets')
        .update({
          status: 'resolved',
          resolved_at: timestamp,
          updated_at: timestamp
        })
        .eq('id', existingRepair.ticket_id);

      await adminClient.from('service_ticket_updates').insert({
        ticket_id: existingRepair.ticket_id,
        update_text: `Repair completed successfully. Findings: ${findings || 'Resolved'}. Outcome: ${outcome}.`,
        status: 'resolved',
        updated_by: profile.id
      });
    } else {
      await adminClient.from('service_ticket_updates').insert({
        ticket_id: existingRepair.ticket_id,
        update_text: `Repair investigation update: Outcome is "${outcome}". ${findings ? `Findings: ${findings}` : ''}`,
        status: 'in_progress',
        updated_by: profile.id
      });
    }

    // Log activity
    await logSupportActivity({
      actorId: profile.id,
      action: 'REPAIR_COMPLETED',
      entityType: 'repair_assignment',
      entityId: id,
      metadata: { outcome, findings, resolve_ticket }
    });

    return jsonResponse(updatedRepair, { message: 'Repair outcome recorded successfully.' });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
