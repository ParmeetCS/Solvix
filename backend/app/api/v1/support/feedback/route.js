import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireCustomerOrSupportOrAdmin, logSupportActivity } from '@/lib/supabase/supportAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/support/feedback
 * Returns feedback metrics (average rating, distribution, total count) and recent feedback list.
 */
export async function GET(request) {
  try {
    const authResult = await requireCustomerOrSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;
    const { searchParams } = new URL(request.url);
    const ticket_id = searchParams.get('ticket_id');

    let query = adminClient
      .from('customer_feedback')
      .select(`
        id,
        ticket_id,
        customer_id,
        rating,
        comment,
        submitted_at,
        customers:customer_id ( id, contact_name, email ),
        service_tickets:ticket_id ( id, ticket_code, subject )
      `)
      .order('submitted_at', { ascending: false });

    if (ticket_id) {
      query = query.eq('ticket_id', ticket_id);
    }

    const { data: feedbackList, error } = await query;
    if (error) {
      return jsonError('Database error fetching feedback: ' + error.message, 500);
    }

    const list = feedbackList || [];
    const total = list.length;
    let sum = 0;
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    list.forEach((f) => {
      const r = Math.min(5, Math.max(1, f.rating));
      sum += r;
      ratingBreakdown[r] = (ratingBreakdown[r] || 0) + 1;
    });

    const averageRating = total > 0 ? (sum / total).toFixed(1) : '5.0';

    return jsonResponse({
      summary: {
        totalFeedback: total,
        averageRating: parseFloat(averageRating),
        ratingBreakdown
      },
      feedback: list
    });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/support/feedback
 * Submits customer satisfaction rating & feedback for a resolved ticket.
 */
export async function POST(request) {
  try {
    const authResult = await requireCustomerOrSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isCustomer, customerRecord, adminClient } = authResult;
    const body = await request.json().catch(() => ({}));

    let { ticket_id, rating, comment = '' } = body;

    if (!ticket_id || !rating) {
      return jsonError('ticket_id and rating (1-5) are required.', 400);
    }

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return jsonError('Rating must be an integer between 1 and 5.', 400);
    }

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await adminClient
      .from('service_tickets')
      .select('id, ticket_code, customer_id, status')
      .eq('id', ticket_id)
      .single();

    if (ticketError || !ticket) {
      return jsonError('Ticket not found.', 404);
    }

    let customerId = ticket.customer_id;
    if (isCustomer && customerRecord) {
      if (ticket.customer_id !== customerRecord.id) {
        return jsonError('Access denied: You can only submit feedback for your own tickets.', 403);
      }
      customerId = customerRecord.id;
    }

    // Check if feedback already exists for this ticket
    const { data: existingFeedback } = await adminClient
      .from('customer_feedback')
      .select('id')
      .eq('ticket_id', ticket_id)
      .maybeSingle();

    let feedbackRecord;
    if (existingFeedback) {
      const { data: updated, error: updateErr } = await adminClient
        .from('customer_feedback')
        .update({
          rating: numRating,
          comment: comment.trim(),
          submitted_at: new Date().toISOString()
        })
        .eq('id', existingFeedback.id)
        .select('*')
        .single();

      if (updateErr) {
        return jsonError('Failed to update feedback: ' + updateErr.message, 500);
      }
      feedbackRecord = updated;
    } else {
      const { data: created, error: insertErr } = await adminClient
        .from('customer_feedback')
        .insert({
          ticket_id,
          customer_id: customerId,
          rating: numRating,
          comment: comment.trim()
        })
        .select('*')
        .single();

      if (insertErr) {
        return jsonError('Failed to record feedback: ' + insertErr.message, 500);
      }
      feedbackRecord = created;
    }

    // Add note to ticket updates
    await adminClient.from('service_ticket_updates').insert({
      ticket_id,
      update_text: `Customer submitted feedback: Rating ${numRating}/5 ⭐. Comment: "${comment.trim() || 'No comment provided'}"`,
      status: ticket.status,
      updated_by: profile.id
    });

    // Log activity
    await logSupportActivity({
      actorId: profile.id,
      action: 'FEEDBACK_SUBMITTED',
      entityType: 'customer_feedback',
      entityId: feedbackRecord.id,
      metadata: { ticket_id, rating: numRating }
    });

    return jsonResponse(feedbackRecord, { message: 'Thank you for your feedback!', status: 201 });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
