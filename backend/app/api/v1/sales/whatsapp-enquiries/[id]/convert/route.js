import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

function generateLeadCode() {
  const yr = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LEAD-${yr}-${rand}`;
}

/**
 * POST /api/v1/sales/whatsapp-enquiries/[id]/convert
 * Converts a WhatsApp enquiry into a formal Lead.
 */
export async function POST(request, { params }) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Fetch the enquiry
    const { data: enquiry, error: fetchErr } = await adminClient
      .from('whatsapp_enquiries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !enquiry) {
      return jsonError('WhatsApp enquiry not found.', 404);
    }

    if (enquiry.lead_id) {
      return jsonError('This enquiry has already been converted to lead.', 400);
    }

    // Create the lead
    const leadCode = generateLeadCode();
    const { data: newLead, error: leadErr } = await adminClient
      .from('leads')
      .insert({
        lead_code: leadCode,
        customer_name: enquiry.sender_name,
        phone: enquiry.phone,
        source: 'whatsapp',
        status: 'new',
        priority: body.priority || 'medium',
        system_type: body.system_type || 'on-grid',
        notes: `Converted from WhatsApp enquiry: "${enquiry.message}"`,
        customer_id: enquiry.customer_id || null,
        assigned_to: body.assigned_to || profile.id,
        created_by: profile.id,
        updated_by: profile.id
      })
      .select('*')
      .single();

    if (leadErr) {
      return jsonError('Failed to create lead from enquiry: ' + leadErr.message, 500);
    }

    // Link enquiry to the newly created lead and update status
    await adminClient
      .from('whatsapp_enquiries')
      .update({
        lead_id: newLead.id,
        status: 'converted_to_lead',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    // Record initial assignment
    await adminClient.from('lead_assignments').insert({
      lead_id: newLead.id,
      assigned_to: body.assigned_to || profile.id,
      assigned_by: profile.id,
      notes: 'Initial assignment upon conversion from WhatsApp enquiry'
    });

    // Record interaction
    await adminClient.from('customer_interactions').insert({
      lead_id: newLead.id,
      customer_id: enquiry.customer_id || null,
      interaction_type: 'whatsapp',
      subject: 'Converted WhatsApp Enquiry to Lead',
      summary: enquiry.message,
      created_by: profile.id
    });

    await logActivity({
      actorId: profile.id,
      action: 'WHATSAPP_CONVERTED_TO_LEAD',
      entityType: 'whatsapp_enquiry',
      entityId: id,
      metadata: { lead_id: newLead.id, lead_code: leadCode }
    });

    return jsonResponse({
      enquiryId: id,
      lead: newLead
    }, { message: `Enquiry successfully converted to lead ${leadCode}.`, status: 201 });
  } catch (error) {
    return jsonError('Server error converting enquiry: ' + error.message, 500);
  }
}
