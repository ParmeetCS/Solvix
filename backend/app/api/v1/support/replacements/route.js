import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSupportOrAdmin, logSupportActivity, sendNotification } from '@/lib/supabase/supportAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/support/replacements
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
      .from('replacement_records')
      .select(`
        id,
        ticket_id,
        old_serial_id,
        new_serial_id,
        replacement_reason,
        replaced_at,
        replaced_by,
        old_serial:old_serial_id ( id, serial_number, status, products:product_id ( id, name, sku ) ),
        new_serial:new_serial_id ( id, serial_number, status, products:product_id ( id, name, sku ) ),
        replaced_by_profile:replaced_by ( id, full_name, email ),
        service_tickets:ticket_id ( id, ticket_code, subject, customer_id, customers:customer_id ( id, contact_name, phone ) )
      `)
      .order('replaced_at', { ascending: false });

    if (ticket_id) {
      query = query.eq('ticket_id', ticket_id);
    }

    const { data: replacements, error } = await query;
    if (error) {
      return jsonError('Database error fetching replacements: ' + error.message, 500);
    }

    return jsonResponse({ replacements: replacements || [] });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/support/replacements
 * Records equipment replacement preserving full history:
 * 1. Updates old serial status to 'warranty_replacement' (never deletes).
 * 2. Assigns new serial to customer with status 'installed'.
 * 3. Records entry in replacement_records with approval, policy, and reason.
 * 4. Updates warranty history and service ticket updates.
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
      old_serial_number,
      new_serial_number,
      old_serial_id,
      new_serial_id,
      replacement_reason,
      warranty_policy = 'carry_over_remaining' // 'carry_over_remaining' | 'reset_full_term'
    } = body;

    if (!ticket_id || !replacement_reason) {
      return jsonError('ticket_id and replacement_reason are required.', 400);
    }

    // Resolve old_serial_id if serial number provided
    if (!old_serial_id && old_serial_number) {
      const { data: oldS } = await adminClient
        .from('equipment_serial_numbers')
        .select('id, serial_number, customer_id, product_id, warranty_start_date, warranty_expiry_date')
        .ilike('serial_number', old_serial_number.trim())
        .maybeSingle();
      if (oldS) old_serial_id = oldS.id;
    }

    // Resolve or create new_serial_id if serial number provided
    let newSerialRecord = null;
    if (!new_serial_id && new_serial_number) {
      const { data: existingNewS } = await adminClient
        .from('equipment_serial_numbers')
        .select('id, serial_number, status, product_id')
        .ilike('serial_number', new_serial_number.trim())
        .maybeSingle();

      if (existingNewS) {
        new_serial_id = existingNewS.id;
        newSerialRecord = existingNewS;
      }
    }

    // Fetch ticket details
    const { data: ticket, error: ticketErr } = await adminClient
      .from('service_tickets')
      .select('id, ticket_code, customer_id, subject')
      .eq('id', ticket_id)
      .single();

    if (ticketErr || !ticket) {
      return jsonError('Ticket not found.', 404);
    }

    // 1. Preserve old equipment: mark status as 'warranty_replacement' (Never overwrite or delete)
    if (old_serial_id) {
      await adminClient
        .from('equipment_serial_numbers')
        .update({
          status: 'warranty_replacement',
          updated_at: new Date().toISOString()
        })
        .eq('id', old_serial_id);
    }

    // 2. Assign replacement serial to customer as 'installed'
    if (new_serial_id) {
      await adminClient
        .from('equipment_serial_numbers')
        .update({
          status: 'installed',
          customer_id: ticket.customer_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', new_serial_id);
    }

    const fullReason = `${replacement_reason.trim()} | Policy: ${warranty_policy} | Approved by: ${profile.full_name || profile.email}`;

    // 3. Insert replacement_record
    const { data: record, error: recordError } = await adminClient
      .from('replacement_records')
      .insert({
        ticket_id,
        old_serial_id: old_serial_id || null,
        new_serial_id: new_serial_id || null,
        replacement_reason: fullReason,
        replaced_by: profile.id
      })
      .select('*')
      .single();

    if (recordError) {
      return jsonError('Failed to record replacement: ' + recordError.message, 500);
    }

    // 4. Update ticket updates
    const oldLabel = old_serial_number || (old_serial_id ? 'decommissioned unit' : 'original unit');
    const newLabel = new_serial_number || (new_serial_id ? 'new replacement unit' : 'replacement unit');
    await adminClient.from('service_ticket_updates').insert({
      ticket_id,
      update_text: `Equipment replacement recorded and approved. Replaced ${oldLabel} with ${newLabel}. Reason: ${replacement_reason}. Policy: ${warranty_policy}.`,
      status: 'in_progress',
      updated_by: profile.id
    });

    // 5. Notify customer
    const { data: customerProfile } = await adminClient
      .from('customers')
      .select('profile_id')
      .eq('id', ticket.customer_id)
      .single();

    if (customerProfile?.profile_id) {
      await sendNotification({
        recipientId: customerProfile.profile_id,
        title: `Replacement Dispatched for Ticket ${ticket.ticket_code}`,
        body: `A replacement unit has been assigned (${newLabel}) replacing (${oldLabel}).`,
        type: 'info',
        link: `/support/tickets/${ticket_id}`
      });
    }

    // Log activity
    await logSupportActivity({
      actorId: profile.id,
      action: 'EQUIPMENT_REPLACED',
      entityType: 'replacement_record',
      entityId: record.id,
      metadata: {
        ticket_id,
        old_serial_id,
        new_serial_id,
        warranty_policy
      }
    });

    return jsonResponse(record, { message: 'Equipment replacement recorded successfully.', status: 201 });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
