import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireCustomerOrSupportOrAdmin, logSupportActivity, sendNotification } from '@/lib/supabase/supportAuth';

export async function OPTIONS() {
  return handleOptions();
}

function parseTicketSubject(rawSubject) {
  const match = (rawSubject || '').match(/^\[(.*?)\]\s*(.*)$/);
  if (match) {
    return { category: match[1], cleanSubject: match[2] };
  }
  return { category: 'Other', cleanSubject: rawSubject || '' };
}

function extractSerialFromDescription(desc) {
  const match = (desc || '').match(/\[Equipment Serial:\s*([^\]]+)\]/);
  return match ? match[1].trim() : null;
}

/**
 * GET /api/v1/support/tickets/[id]
 */
export async function GET(request, { params }) {
  try {
    const authResult = await requireCustomerOrSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient, isCustomer, customerRecord } = authResult;
    const { id } = await params;

    // Fetch ticket
    const { data: ticket, error: ticketError } = await adminClient
      .from('service_tickets')
      .select(`
        *,
        customers:customer_id ( id, customer_code, contact_name, email, phone, company_name ),
        assigned_profile:assigned_to ( id, full_name, email )
      `)
      .eq('id', id)
      .single();

    if (ticketError || !ticket) {
      return jsonError('Ticket not found.', 404);
    }

    // Customer scoping
    if (isCustomer && customerRecord && ticket.customer_id !== customerRecord.id) {
      return jsonError('Access denied. You can only view your own tickets.', 403);
    }

    // Fetch timeline updates
    const { data: updates } = await adminClient
      .from('service_ticket_updates')
      .select(`
        id,
        update_text,
        status,
        created_at,
        profiles:updated_by ( id, full_name, email )
      `)
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    // Mark internal vs public notes based on prefix
    const parsedUpdates = (updates || []).map((u) => {
      const isInternal = u.update_text.startsWith('[INTERNAL NOTE]');
      return {
        ...u,
        is_internal: isInternal,
        update_text: isInternal ? u.update_text.replace('[INTERNAL NOTE]', '').trim() : u.update_text
      };
    });

    // Filter internal notes for customers
    const visibleUpdates = isCustomer ? parsedUpdates.filter((u) => !u.is_internal) : parsedUpdates;

    // Fetch repair assignments
    const { data: repairs } = await adminClient
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
        technicians:technician_id (
          id,
          employee_code,
          skills,
          profiles:profile_id ( id, full_name, email, phone )
        )
      `)
      .eq('ticket_id', id)
      .order('assigned_at', { ascending: false });

    // Fetch replacement records
    const { data: replacements } = await adminClient
      .from('replacement_records')
      .select(`
        id,
        ticket_id,
        old_serial_id,
        new_serial_id,
        replacement_reason,
        replaced_at,
        replaced_by,
        old_serial:old_serial_id ( id, serial_number, status ),
        new_serial:new_serial_id ( id, serial_number, status ),
        replaced_by_profile:replaced_by ( id, full_name, email )
      `)
      .eq('ticket_id', id)
      .order('replaced_at', { ascending: false });

    // Fetch customer feedback
    const { data: feedback } = await adminClient
      .from('customer_feedback')
      .select('*')
      .eq('ticket_id', id)
      .maybeSingle();

    // Check serial and live warranty if serial in description
    const serialFromDesc = extractSerialFromDescription(ticket.description);
    let warrantyInfo = null;

    if (serialFromDesc) {
      const { data: serialRecord } = await adminClient
        .from('equipment_serial_numbers')
        .select(`
          id,
          serial_number,
          status,
          warranty_start_date,
          warranty_expiry_date,
          products:product_id ( id, name, sku, warranty_years )
        `)
        .ilike('serial_number', serialFromDesc)
        .maybeSingle();

      if (serialRecord) {
        const { data: warranty } = await adminClient
          .from('warranties')
          .select('*')
          .eq('equipment_serial_id', serialRecord.id)
          .maybeSingle();

        const today = new Date().toISOString().split('T')[0];
        const expiry = warranty?.expiry_date || serialRecord.warranty_expiry_date;
        const isExpired = expiry ? expiry < today : false;

        warrantyInfo = {
          serial_number: serialRecord.serial_number,
          serial_id: serialRecord.id,
          product: serialRecord.products,
          warranty,
          start_date: warranty?.start_date || serialRecord.warranty_start_date,
          expiry_date: expiry,
          is_valid: !isExpired && (warranty?.status === 'active' || !warranty),
          computed_status: isExpired ? 'expired' : (warranty?.status || 'active')
        };
      }
    }

    const parsedSubject = parseTicketSubject(ticket.subject);

    return jsonResponse({
      ticket: {
        ...ticket,
        ticket_number: ticket.ticket_code,
        issue_category: parsedSubject.category,
        display_subject: parsedSubject.cleanSubject,
        extracted_serial: serialFromDesc
      },
      updates: visibleUpdates,
      repairs: repairs || [],
      replacements: replacements || [],
      feedback: feedback || null,
      warrantyInfo
    });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}

/**
 * PATCH /api/v1/support/tickets/[id]
 * Updates ticket status, priority, or description.
 */
export async function PATCH(request, { params }) {
  try {
    const authResult = await requireCustomerOrSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isCustomer, customerRecord, adminClient } = authResult;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Fetch current ticket
    const { data: existingTicket, error: fetchError } = await adminClient
      .from('service_tickets')
      .select('id, ticket_code, customer_id, status, assigned_to')
      .eq('id', id)
      .single();

    if (fetchError || !existingTicket) {
      return jsonError('Ticket not found.', 404);
    }

    // Customers can only update their own ticket
    if (isCustomer) {
      if (customerRecord && existingTicket.customer_id !== customerRecord.id) {
        return jsonError('Unauthorized.', 403);
      }
    }

    const {
      status,
      priority,
      description,
      note = ''
    } = body;

    const updatePayload = {
      updated_at: new Date().toISOString()
    };

    if (status && status !== existingTicket.status) {
      // Map statuses to allowed check constraint: ('open','assigned','in_progress','waiting_for_parts','resolved','closed')
      const allowedStatuses = ['open', 'assigned', 'in_progress', 'waiting_for_parts', 'resolved', 'closed'];
      let targetStatus = status.toLowerCase();
      if (targetStatus === 'new') targetStatus = 'open';
      if (targetStatus === 'waiting_for_customer' || targetStatus === 'waiting_for_technician') {
        targetStatus = 'waiting_for_parts';
      }

      if (allowedStatuses.includes(targetStatus)) {
        updatePayload.status = targetStatus;
      }
      if (status === 'resolved') {
        updatePayload.resolved_at = new Date().toISOString();
      }
      if (status === 'closed') {
        updatePayload.closed_at = new Date().toISOString();
      }
    }

    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      let safePriority = priority.toLowerCase();
      if (safePriority === 'urgent') safePriority = 'critical';
      if (validPriorities.includes(safePriority)) {
        updatePayload.priority = safePriority;
      }
    }

    if (description) {
      updatePayload.description = description.trim();
    }

    const { data: updatedTicket, error: updateError } = await adminClient
      .from('service_tickets')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return jsonError('Failed to update ticket: ' + updateError.message, 500);
    }

    // Log update note if status changed or note provided
    if (status && status !== existingTicket.status) {
      await adminClient.from('service_ticket_updates').insert({
        ticket_id: id,
        update_text: note ? `Status changed to ${status}. Note: ${note}` : `Status changed to ${status}.`,
        status: updatePayload.status || existingTicket.status,
        updated_by: profile.id
      });

      // Notify customer of status change
      const { data: customerProfile } = await adminClient
        .from('customers')
        .select('profile_id')
        .eq('id', existingTicket.customer_id)
        .single();

      if (customerProfile?.profile_id) {
        await sendNotification({
          recipientId: customerProfile.profile_id,
          title: `Ticket ${existingTicket.ticket_code} Updated`,
          body: `Your service ticket status is now "${status}".`,
          type: 'info',
          link: `/support/tickets/${id}`
        });
      }
    }

    await logSupportActivity({
      actorId: profile.id,
      action: 'TICKET_UPDATED',
      entityType: 'service_ticket',
      entityId: id,
      metadata: updatePayload
    });

    return jsonResponse({
      ...updatedTicket,
      ticket_number: updatedTicket.ticket_code
    }, { message: 'Ticket updated successfully.' });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
