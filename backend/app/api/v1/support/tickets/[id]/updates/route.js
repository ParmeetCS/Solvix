import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireCustomerOrSupportOrAdmin, logSupportActivity, sendNotification } from '@/lib/supabase/supportAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/support/tickets/[id]/updates
 * Adds a progress note or customer/agent message to the ticket.
 */
export async function POST(request, { params }) {
  try {
    const authResult = await requireCustomerOrSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isCustomer, customerRecord, adminClient } = authResult;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { update_text, is_internal = false } = body;
    if (!update_text || !update_text.trim()) {
      return jsonError('update_text is required.', 400);
    }

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await adminClient
      .from('service_tickets')
      .select('id, ticket_code, customer_id, assigned_to, status')
      .eq('id', id)
      .single();

    if (ticketError || !ticket) {
      return jsonError('Ticket not found.', 404);
    }

    // Customers cannot post internal notes
    const finalIsInternal = isCustomer ? false : Boolean(is_internal);
    const textToStore = finalIsInternal
      ? `[INTERNAL NOTE] ${update_text.trim()}`
      : update_text.trim();

    const { data: updateEntry, error: insertError } = await adminClient
      .from('service_ticket_updates')
      .insert({
        ticket_id: id,
        update_text: textToStore,
        status: ticket.status,
        updated_by: profile.id
      })
      .select(`
        id,
        update_text,
        status,
        created_at,
        profiles:updated_by ( id, full_name, email )
      `)
      .single();

    if (insertError) {
      return jsonError('Failed to record ticket update: ' + insertError.message, 500);
    }

    // If customer replied, notify assigned support agent
    if (isCustomer && ticket.assigned_to) {
      await sendNotification({
        recipientId: ticket.assigned_to,
        title: `Customer Message on ${ticket.ticket_code}`,
        body: update_text.trim().substring(0, 100),
        type: 'info',
        link: `/support/tickets/${id}`
      });
    }

    // If support agent replied publicly, notify customer
    if (!isCustomer && !finalIsInternal) {
      const { data: cust } = await adminClient
        .from('customers')
        .select('profile_id')
        .eq('id', ticket.customer_id)
        .single();

      if (cust?.profile_id) {
        await sendNotification({
          recipientId: cust.profile_id,
          title: `Update on Ticket ${ticket.ticket_code}`,
          body: update_text.trim().substring(0, 100),
          type: 'info',
          link: `/support/tickets/${id}`
        });
      }
    }

    return jsonResponse({
      ...updateEntry,
      is_internal: finalIsInternal,
      update_text: update_text.trim()
    }, { message: 'Ticket note added successfully.', status: 201 });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
