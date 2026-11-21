import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSupportOrAdmin, logSupportActivity, sendNotification } from '@/lib/supabase/supportAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/support/tickets/[id]/assign
 * Assigns or reassigns ticket to a support specialist or technician.
 */
export async function POST(request, { params }) {
  try {
    const authResult = await requireSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { assigned_to, notes = '' } = body;
    if (!assigned_to) {
      return jsonError('assigned_to is required.', 400);
    }

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await adminClient
      .from('service_tickets')
      .select('id, ticket_code, subject, customer_id, assigned_to')
      .eq('id', id)
      .single();

    if (ticketError || !ticket) {
      return jsonError('Ticket not found.', 404);
    }

    // Verify assigned employee
    const { data: assignee, error: assigneeError } = await adminClient
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', assigned_to)
      .single();

    if (assigneeError || !assignee) {
      return jsonError('Assigned user not found.', 404);
    }

    // Update ticket
    const { data: updatedTicket, error: updateError } = await adminClient
      .from('service_tickets')
      .update({
        assigned_to,
        status: 'assigned',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return jsonError('Failed to assign ticket: ' + updateError.message, 500);
    }

    // Insert update entry (internal note)
    await adminClient.from('service_ticket_updates').insert({
      ticket_id: id,
      update_text: `[INTERNAL NOTE] Assigned to ${assignee.full_name || assignee.email} by ${profile.full_name || 'Admin'}. ${notes ? `Note: ${notes}` : ''}`,
      status: 'assigned',
      updated_by: profile.id
    });

    // Notify assignee
    await sendNotification({
      recipientId: assigned_to,
      title: `Ticket Assigned: ${ticket.ticket_code}`,
      body: `You were assigned ticket "${ticket.subject}".`,
      type: 'assignment',
      link: `/support/tickets/${id}`
    });

    // Log activity
    await logSupportActivity({
      actorId: profile.id,
      action: 'TICKET_ASSIGNED',
      entityType: 'service_ticket',
      entityId: id,
      metadata: {
        assigned_to,
        assigned_to_name: assignee.full_name,
        notes
      }
    });

    return jsonResponse({
      ...updatedTicket,
      ticket_number: updatedTicket.ticket_code
    }, { message: `Ticket assigned to ${assignee.full_name || assignee.email}.` });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
