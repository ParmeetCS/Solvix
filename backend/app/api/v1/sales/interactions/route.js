import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/sales/interactions
 * Lists customer and lead interactions.
 */
export async function GET(request) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;
    const { searchParams } = new URL(request.url);

    const leadId = searchParams.get('lead_id');
    const customerId = searchParams.get('customer_id');

    let query = adminClient
      .from('customer_interactions')
      .select(`
        *,
        author:created_by ( id, full_name, email ),
        lead:lead_id ( id, lead_code, customer_name, phone ),
        customer:customer_id ( id, customer_code, contact_name, phone )
      `)
      .order('occurred_at', { ascending: false });

    if (leadId) query = query.eq('lead_id', leadId);
    if (customerId) query = query.eq('customer_id', customerId);

    const { data: interactions, error } = await query.limit(50);
    if (error) {
      return jsonError('Failed to fetch interactions: ' + error.message, 500);
    }

    return jsonResponse(interactions || []);
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/sales/interactions
 * Records a new customer/lead interaction (Call, WhatsApp, Meeting, Site Visit, Email).
 */
export async function POST(request) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json();

    const {
      lead_id,
      customer_id,
      interaction_type = 'call',
      subject,
      summary,
      occurred_at = new Date().toISOString()
    } = body;

    if (!subject) {
      return jsonError('Interaction subject is required.', 400);
    }

    const { data: interaction, error } = await adminClient
      .from('customer_interactions')
      .insert({
        lead_id: lead_id || null,
        customer_id: customer_id || null,
        interaction_type,
        subject,
        summary: summary || null,
        occurred_at,
        created_by: profile.id
      })
      .select('*')
      .single();

    if (error) {
      return jsonError('Failed to record interaction: ' + error.message, 500);
    }

    await logActivity({
      actorId: profile.id,
      action: 'INTERACTION_LOGGED',
      entityType: 'customer_interaction',
      entityId: interaction.id,
      metadata: { interaction_type, subject, lead_id, customer_id }
    });

    return jsonResponse(interaction, { message: 'Interaction logged successfully.', status: 201 });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
