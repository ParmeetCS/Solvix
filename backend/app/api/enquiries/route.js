import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';
import { logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

const SYSTEM_TYPES = { 'on-grid': 'on-grid', 'off-grid': 'off-grid' };
const MAX_PER_HOUR_PER_PHONE = 3;

const clean = (v, max = 500) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * POST /api/enquiries   (public - used by the "Get a quote" form)
 *
 * Creates an unassigned lead (source "website", status "new"). It then shows up
 * in the Admin portal and in the Sales team's lead queue, which is step 1-2 of
 * the SOLVIX workflow (Customer Enquiry -> Lead Management).
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Honeypot: real visitors never fill this hidden field.
    if (body.website) return jsonResponse({ reference: null }, { status: 201, message: 'Thank you. Your enquiry has been received.' });

    const name = clean(body.fullName, 120);
    const phone = clean(body.phone, 20);
    const email = clean(body.email, 160).toLowerCase();
    const address = clean(body.address, 400);

    if (name.length < 2) return jsonError('Please enter your full name.', 400);
    if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) return jsonError('Please enter a valid phone number.', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError('Please enter a valid email address.', 400);
    if (address.length < 5) return jsonError('Please enter the installation address.', 400);

    const systemKey = clean(body.systemType, 20).toLowerCase();
    const systemType = SYSTEM_TYPES[systemKey] || 'on-grid';
    const capacityMatch = clean(body.capacity, 20).match(/^(\d+(?:\.\d+)?)/);
    const capacity = capacityMatch ? parseFloat(capacityMatch[1]) : null;
    const bill = parseFloat(clean(body.monthlyBill, 20).replace(/[^0-9.]/g, ''));

    const notes = [];
    if (!SYSTEM_TYPES[systemKey]) notes.push('Customer is not sure which system type they need.');
    if (capacity === null) notes.push('Customer is not sure about the required capacity.');
    if (clean(body.additional, 1000)) notes.push(clean(body.additional, 1000));

    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return jsonError('The enquiry service is not configured yet. Please call us instead.', 503);
    }

    // Light abuse protection: a few enquiries per phone number per hour.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recent } = await admin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .eq('source', 'website')
      .gte('created_at', since);
    if ((recent || 0) >= MAX_PER_HOUR_PER_PHONE) {
      return jsonError('We already have your enquiry. Our team will contact you shortly.', 429);
    }

    const leadCode = `LEAD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const { data: lead, error } = await admin
      .from('leads')
      .insert({
        lead_code: leadCode,
        customer_name: name,
        phone,
        email,
        address,
        source: 'website',
        status: 'new',
        system_type: systemType,
        expected_capacity_kw: capacity,
        monthly_electricity_bill: Number.isFinite(bill) ? bill : null,
        additional_requirements: notes.join(' ') || null,
        priority: 'medium',
        assigned_to: null,
      })
      .select('id, lead_code')
      .single();

    if (error) {
      console.error('Enquiry insert failed:', error.message);
      return jsonError('We could not save your enquiry right now. Please try again in a few minutes.', 500);
    }

    await logActivity({
      actorId: null,
      action: 'ENQUIRY_RECEIVED',
      entityType: 'lead',
      entityId: lead.id,
      metadata: { lead_code: lead.lead_code, source: 'website' },
    });

    return jsonResponse(
      { reference: lead.lead_code },
      { status: 201, message: `Thank you ${name.split(' ')[0]}! Your enquiry ${lead.lead_code} has been received. Our team will contact you soon.` },
    );
  } catch (error) {
    console.error('Enquiry error:', error);
    return jsonError('Something went wrong. Please try again.', 500);
  }
}
