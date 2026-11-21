import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireCustomerOrSupportOrAdmin, logSupportActivity, sendNotification } from '@/lib/supabase/supportAuth';

export async function OPTIONS() {
  return handleOptions();
}

function generateTicketNumber() {
  const yr = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TCK-${yr}-${rand}`;
}

function parseTicketSubject(rawSubject) {
  const match = (rawSubject || '').match(/^\[(.*?)\]\s*(.*)$/);
  if (match) {
    return { category: match[1], cleanSubject: match[2] };
  }
  return { category: 'Other', cleanSubject: rawSubject || '' };
}

/**
 * GET /api/v1/support/tickets
 * Supports search, status, priority, category, and pagination.
 * If requester is a customer, automatically filters by their customer_id.
 */
export async function GET(request) {
  try {
    const authResult = await requireCustomerOrSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient, isCustomer, customerRecord } = authResult;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const category = searchParams.get('category') || '';
    const assigned_to = searchParams.get('assigned_to') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = adminClient
      .from('service_tickets')
      .select(`
        id,
        ticket_code,
        subject,
        description,
        status,
        priority,
        created_at,
        updated_at,
        resolved_at,
        closed_at,
        customer_id,
        installation_id,
        warranty_claim_id,
        assigned_to,
        customers:customer_id ( id, customer_code, contact_name, email, phone ),
        assigned_profile:assigned_to ( id, full_name, email )
      `, { count: 'exact' });

    // Customer scoping
    if (isCustomer) {
      if (!customerRecord) {
        return jsonResponse({ tickets: [], total: 0, page, limit });
      }
      query = query.eq('customer_id', customerRecord.id);
    }

    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to);
    }
    if (category) {
      query = query.ilike('subject', `%[${category}]%`);
    }

    if (search) {
      query = query.or(`ticket_code.ilike.%${search}%,subject.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: tickets, count, error } = await query;
    if (error) {
      return jsonError('Database error fetching tickets: ' + error.message, 500);
    }

    const enriched = (tickets || []).map((t) => {
      const parsed = parseTicketSubject(t.subject);
      return {
        ...t,
        ticket_number: t.ticket_code,
        issue_category: parsed.category,
        display_subject: parsed.cleanSubject
      };
    });

    return jsonResponse({
      tickets: enriched,
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
 * POST /api/v1/support/tickets
 * Creates a new service ticket. Customers or support agents can submit.
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
      customer_id,
      subject,
      description,
      priority = 'medium',
      issue_category = 'Other',
      equipment_serial_number = null,
      order_id = null,
      contact_phone = null,
      contact_email = null,
      assigned_to = null
    } = body;

    // If customer is creating the ticket, enforce their customer_id
    if (isCustomer) {
      if (!customerRecord) {
        return jsonError('No customer record associated with your account.', 400);
      }
      customer_id = customerRecord.id;
      contact_phone = contact_phone || customerRecord.phone;
      contact_email = contact_email || customerRecord.email;
      assigned_to = null; // Unassigned initially for triage
    }

    if (!customer_id || !subject || !description) {
      return jsonError('customer_id, subject, and description are required.', 400);
    }

    const ticketNumber = generateTicketNumber();

    // Map priority to database check constraint ('low','medium','high','critical')
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    let safePriority = priority.toLowerCase();
    if (safePriority === 'urgent') safePriority = 'critical';
    if (!validPriorities.includes(safePriority)) safePriority = 'medium';

    // Format subject with category tag
    const formattedSubject = issue_category && issue_category !== 'Other'
      ? `[${issue_category}] ${subject.trim()}`
      : subject.trim();

    // Append metadata to description for seamless history preservation
    let enrichedDescription = description.trim();
    if (equipment_serial_number) {
      enrichedDescription += `\n\n[Equipment Serial: ${equipment_serial_number}]`;
    }
    if (contact_phone || contact_email) {
      enrichedDescription += `\n[Contact: ${[contact_phone, contact_email].filter(Boolean).join(' | ')}]`;
    }

    const insertPayload = {
      ticket_code: ticketNumber,
      customer_id,
      subject: formattedSubject,
      description: enrichedDescription,
      priority: safePriority,
      status: assigned_to ? 'assigned' : 'open',
      assigned_to: assigned_to || null
    };

    const { data: newTicket, error: insertError } = await adminClient
      .from('service_tickets')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError) {
      return jsonError('Database error creating ticket: ' + insertError.message, 500);
    }

    // Add initial entry in service_ticket_updates
    await adminClient.from('service_ticket_updates').insert({
      ticket_id: newTicket.id,
      update_text: `Ticket created. Category: ${issue_category}. Priority: ${safePriority}.`,
      status: newTicket.status,
      updated_by: profile.id
    });

    // Notify assigned agent if assigned
    if (assigned_to) {
      await sendNotification({
        recipientId: assigned_to,
        title: `New Ticket Assigned: ${ticketNumber}`,
        body: `You have been assigned ticket "${formattedSubject}".`,
        type: 'assignment',
        link: `/support/tickets/${newTicket.id}`
      });
    }

    // Log activity
    await logSupportActivity({
      actorId: profile.id,
      action: 'TICKET_CREATED',
      entityType: 'service_ticket',
      entityId: newTicket.id,
      metadata: { ticket_number: ticketNumber, customer_id, issue_category, priority: safePriority }
    });

    return jsonResponse({
      ...newTicket,
      ticket_number: newTicket.ticket_code,
      issue_category,
      display_subject: subject.trim()
    }, { message: 'Service ticket created successfully.', status: 201 });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
