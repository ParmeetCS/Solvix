import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/sales/follow-ups
 * Lists follow-ups with filter by status (pending, completed, overdue, upcoming).
 */
export async function GET(request) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isAdmin, adminClient } = authResult;
    const { searchParams } = new URL(request.url);

    const filter = searchParams.get('filter') || 'all'; // pending, completed, overdue, upcoming
    const leadId = searchParams.get('lead_id') || '';

    let query = adminClient
      .from('follow_ups')
      .select(`
        *,
        lead:lead_id (
          id,
          lead_code,
          customer_name,
          phone,
          email,
          status,
          assigned_to,
          assigned_profile:assigned_to ( id, full_name, email )
        )
      `)
      .order('scheduled_at', { ascending: true });

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const now = new Date();
    if (filter === 'completed') {
      query = query.eq('status', 'completed');
    } else if (filter === 'pending') {
      query = query.eq('status', 'pending');
    } else if (filter === 'overdue') {
      query = query.eq('status', 'pending').lt('scheduled_at', now.toISOString());
    } else if (filter === 'upcoming') {
      query = query.eq('status', 'pending').gte('scheduled_at', now.toISOString());
    }

    const { data: followUps, error } = await query;
    if (error) {
      return jsonError('Failed to fetch follow-ups: ' + error.message, 500);
    }

    // Filter by lead assignment if not admin
    const list = followUps || [];
    const scopedList = isAdmin ? list : list.filter(f => f.lead?.assigned_to === profile.id);

    return jsonResponse(scopedList);
  } catch (error) {
    return jsonError('Server error fetching follow-ups: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/sales/follow-ups
 * Schedules a new follow-up for a lead.
 */
export async function POST(request) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isAdmin, adminClient } = authResult;
    const body = await request.json();

    const {
      lead_id,
      scheduled_at,
      follow_up_type = 'phone_call',
      notes = ''
    } = body;

    if (!lead_id || !scheduled_at) {
      return jsonError('lead_id and scheduled_at (ISO date-time) are required.', 400);
    }

    // Verify lead exists and user has permission
    const { data: lead, error: leadErr } = await adminClient
      .from('leads')
      .select('id, lead_code, assigned_to, customer_name')
      .eq('id', lead_id)
      .single();

    if (leadErr || !lead) {
      return jsonError('Referenced lead not found.', 404);
    }

    if (!isAdmin && lead.assigned_to !== profile.id) {
      return jsonError('You can only schedule follow-ups for leads assigned to you.', 403);
    }

    const { data: createdFollowUp, error: insertError } = await adminClient
      .from('follow_ups')
      .insert({
        lead_id,
        scheduled_at,
        follow_up_type,
        notes,
        status: 'pending',
        created_by: profile.id
      })
      .select('*')
      .single();

    if (insertError) {
      return jsonError('Database error creating follow-up: ' + insertError.message, 500);
    }

    // Update lead status to follow_up_required if it was new or contacted
    if (lead.status === 'new' || lead.status === 'contacted') {
      await adminClient
        .from('leads')
        .update({ status: 'follow_up_required', updated_at: new Date().toISOString() })
        .eq('id', lead_id);
    }

    // Log activity
    await logActivity({
      actorId: profile.id,
      action: 'FOLLOW_UP_SCHEDULED',
      entityType: 'follow_up',
      entityId: createdFollowUp.id,
      metadata: { lead_id, scheduled_at, follow_up_type, notes }
    });

    return jsonResponse(createdFollowUp, { message: 'Follow-up scheduled successfully.', status: 201 });
  } catch (error) {
    return jsonError('Server error scheduling follow-up: ' + error.message, 500);
  }
}
