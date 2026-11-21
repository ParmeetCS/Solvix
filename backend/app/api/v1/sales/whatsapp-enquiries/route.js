import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/sales/whatsapp-enquiries
 * Lists WhatsApp enquiries with optional status filter.
 */
export async function GET(request) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    let query = adminClient
      .from('whatsapp_enquiries')
      .select(`
        *,
        lead:lead_id ( id, lead_code, status ),
        customer:customer_id ( id, customer_code, contact_name )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`sender_name.ilike.%${search}%,phone.ilike.%${search}%,message.ilike.%${search}%`);
    }

    const { data: enquiries, error } = await query;
    if (error) {
      return jsonError('Failed to fetch WhatsApp enquiries: ' + error.message, 500);
    }

    return jsonResponse(enquiries || []);
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/sales/whatsapp-enquiries
 * Records a new WhatsApp enquiry received (manual or incoming webhook).
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
      sender_name,
      phone,
      message,
      customer_id = null,
      raw_payload = null
    } = body;

    if (!sender_name || !phone || !message) {
      return jsonError('sender_name, phone, and message are required.', 400);
    }

    // Auto-link with existing customer by phone if available
    let linkedCustomerId = customer_id;
    if (!linkedCustomerId) {
      const { data: matchedCustomer } = await adminClient
        .from('customers')
        .select('id')
        .eq('phone', phone.trim())
        .maybeSingle();

      if (matchedCustomer) {
        linkedCustomerId = matchedCustomer.id;
      }
    }

    const { data: enquiry, error } = await adminClient
      .from('whatsapp_enquiries')
      .insert({
        sender_name: sender_name.trim(),
        phone: phone.trim(),
        message: message.trim(),
        customer_id: linkedCustomerId,
        status: 'new',
        raw_payload: raw_payload || { source: 'manual_entry' },
        created_by: profile.id
      })
      .select('*')
      .single();

    if (error) {
      return jsonError('Failed to create WhatsApp enquiry: ' + error.message, 500);
    }

    // Also record initial interaction in customer_interactions if customer is linked
    if (linkedCustomerId) {
      await adminClient.from('customer_interactions').insert({
        customer_id: linkedCustomerId,
        interaction_type: 'whatsapp',
        subject: 'WhatsApp Enquiry Received',
        summary: message.trim(),
        created_by: profile.id
      });
    }

    await logActivity({
      actorId: profile.id,
      action: 'WHATSAPP_ENQUIRY_RECORDED',
      entityType: 'whatsapp_enquiry',
      entityId: enquiry.id,
      metadata: { sender_name, phone, message }
    });

    return jsonResponse(enquiry, { message: 'WhatsApp enquiry recorded successfully.', status: 201 });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
