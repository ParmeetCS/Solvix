import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';
import { isManagerProfile } from '@/lib/supabase/roles';
import { ApiError } from '@/lib/quotation/errors';
import { calculateQuotationTotals } from '@/lib/quotation/calculations';
import { buildQuotationItems } from '@/lib/quotation/bom';
import {
  assertUuid,
  normaliseDate,
  assertApprovedSurveyForQuotation,
  getCustomerAddress,
  formatAddress,
  getQuotationBundle,
  recordQuotationStatus,
} from '@/lib/quotation/data';
import { generateQuotationCode } from '@/lib/quotation/codes';

export async function OPTIONS() {
  return handleOptions();
}

const DEFAULT_TERMS =
  'This quotation is valid until the stated validity date. Prices cover only the scope listed in the ' +
  'bill of materials. Statutory approvals, net-metering charges and any government levies not listed ' +
  'are excluded unless expressly included. Product specifications and warranties are limited to the ' +
  'configured catalogue data.';

function defaultValidityDate(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * GET /api/v1/sales/quotations
 * Searchable/filterable quotation list with Sales scoping.
 */
export async function GET(request) {
  try {
    const auth = await requireSalesOrAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { profile, isAdmin, adminClient } = auth;
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status') || '';
    const systemType = searchParams.get('system_type') || '';
    const customerId = searchParams.get('customer_id') || '';
    const leadId = searchParams.get('lead_id') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    let query = adminClient
      .from('quotations')
      .select(`
        *,
        customer:customer_id ( id, customer_code, contact_name, company_name, email, phone ),
        lead:lead_id ( id, lead_code, status, assigned_to ),
        created_by_profile:created_by ( id, full_name, email )
      `, { count: 'exact' });

    if (!isAdmin) query = query.eq('created_by', profile.id);
    if (status && status !== 'all') query = query.eq('status', status);
    if (systemType && systemType !== 'all') query = query.eq('system_type', systemType);
    if (customerId) query = query.eq('customer_id', customerId);
    if (leadId) query = query.eq('lead_id', leadId);
    if (from) query = query.gte('created_at', new Date(from).toISOString());
    if (to) query = query.lte('created_at', new Date(to + 'T23:59:59').toISOString());

    if (search) {
      const { data: matchingCustomers } = await adminClient
        .from('customers')
        .select('id')
        .or(`contact_name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,customer_code.ilike.%${search}%`)
        .limit(100);
      const ids = (matchingCustomers || []).map((row) => row.id);
      if (ids.length > 0) {
        query = query.or(
          `quotation_code.ilike.%${search}%,installation_address.ilike.%${search}%,customer_id.in.(${ids.join(',')})`
        );
      } else {
        query = query.or(`quotation_code.ilike.%${search}%,installation_address.ilike.%${search}%`);
      }
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) return jsonError('Failed to fetch quotations: ' + error.message, 500);

    return jsonResponse({
      quotations: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return jsonError(error.message || 'Failed to fetch quotations.', error.status || 500);
  }
}

/**
 * POST /api/v1/sales/quotations
 * Creates a quotation with server-authoritative BOM and totals.
 */
export async function POST(request) {
  try {
    const auth = await requireSalesOrAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { profile, isAdmin, adminClient } = auth;
    const body = await request.json();

    const customerId = assertUuid(body.customer_id, 'customer_id');
    const leadId = assertUuid(body.lead_id, 'lead_id');
    const systemType = body.system_type || 'on-grid';
    const capacity = Number(body.system_capacity_kw);

    if (!['on-grid', 'off-grid', 'hybrid'].includes(systemType)) {
      return jsonError('System type must be on-grid, off-grid or hybrid.', 400);
    }
    if (!Number.isFinite(capacity) || capacity <= 0 || capacity > 1000) {
      return jsonError('System capacity must be greater than zero.', 400);
    }

    const { data: customer, error: customerError } = await adminClient
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .maybeSingle();
    if (customerError) return jsonError('Failed to load customer: ' + customerError.message, 500);
    if (!customer) return jsonError('Customer not found.', 404);
    if (customer.status !== 'active') return jsonError('Customer account is not active.', 400);

    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();
    if (leadError) return jsonError('Failed to load lead: ' + leadError.message, 500);
    if (!lead) return jsonError('Lead not found.', 404);
    if (!isAdmin && lead.assigned_to !== profile.id && lead.created_by !== profile.id) {
      return jsonError('Access denied. You can only quote leads assigned to you.', 403);
    }
    if (lead.customer_id && lead.customer_id !== customerId) {
      return jsonError('The selected lead belongs to a different customer.', 400);
    }
    if (!lead.customer_id) {
      await adminClient
        .from('leads')
        .update({ customer_id: customerId, updated_by: profile.id, updated_at: new Date().toISOString() })
        .eq('id', leadId);
    }

    const survey = body.site_survey_id
      ? await assertApprovedSurveyForQuotation({
          adminClient,
          surveyId: body.site_survey_id,
          leadId,
          customerId,
        })
      : null;

    const packageId = body.package_id ? assertUuid(body.package_id, 'package_id') : null;
    const canOverridePricing = isAdmin || isManagerProfile(profile);
    const globalTaxRate = Number(body.tax_rate ?? 0);

    const built = await buildQuotationItems({
      adminClient,
      rawItems: body.items || [],
      packageId,
      installationCharges: body.installation_charges || 0,
      otherCharges: body.other_charges || 0,
      canOverridePricing,
      globalTaxRate,
    });

    if (built.package) {
      if (built.package.system_type !== systemType) {
        return jsonError('The selected package does not match the quotation system type.', 400);
      }
      if (Number(built.package.capacity_kw) !== Number(capacity)) {
        return jsonError('The selected package does not match the quotation capacity.', 400);
      }
    }

    const totals = calculateQuotationTotals({
      items: built.items,
      discountType: body.discount_type || 'fixed',
      discountValue: body.discount_value || 0,
      taxRate: globalTaxRate,
    });

    const discountPct =
      totals.discount_type === 'percentage'
        ? Number(totals.discount_value)
        : totals.subtotal > 0
          ? (totals.discount_amount / totals.subtotal) * 100
          : 0;
    const approvalRequired =
      Boolean(body.approval_required) || discountPct > 5 || totals.total_amount > 100000;

    const submit = Boolean(body.submit_for_approval);
    const initialStatus = !submit ? 'draft' : approvalRequired ? 'pending_approval' : 'approved';
    const now = new Date().toISOString();

    const address =
      body.installation_address ||
      (await getCustomerAddress(adminClient, customerId).then((row) => formatAddress(row))) ||
      null;

    const quotationCode = generateQuotationCode();
    const payload = {
      quotation_code: quotationCode,
      lead_id: leadId,
      customer_id: customerId,
      site_survey_id: survey?.id || null,
      survey_verified: Boolean(survey),
      package_id: packageId,
      system_type: systemType,
      system_capacity_kw: capacity,
      installation_address: address,
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      discount_amount: totals.discount_amount,
      total_amount: totals.total_amount,
      installation_charges: totals.installation_charges,
      other_charges: totals.other_charges,
      tax_rate: globalTaxRate,
      discount_type: totals.discount_type,
      discount_value: totals.discount_value,
      validity_date: body.validity_date ? normaliseDate(body.validity_date, 'validity_date') : defaultValidityDate(),
      payment_terms: body.payment_terms || null,
      warranty_terms: body.warranty_terms || null,
      terms_and_conditions: body.terms_and_conditions || DEFAULT_TERMS,
      approval_required: approvalRequired,
      status: initialStatus,
      customer_notes: body.customer_notes || null,
      internal_notes: body.internal_notes || null,
      created_by: profile.id,
      updated_by: profile.id,
      updated_at: now,
    };

    if (initialStatus === 'approved') {
      payload.approved_at = now;
      payload.approved_by = profile.id;
    }

    const { data: quotation, error: insertError } = await adminClient
      .from('quotations')
      .insert(payload)
      .select('*')
      .single();

    if (insertError) {
      return jsonError('Failed to create quotation: ' + insertError.message, 500);
    }

    const itemRows = totals.items.map((item, index) => ({
      quotation_id: quotation.id,
      product_id: item.product_id || null,
      line_item: item.line_item,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.line_total,
      notes: item.notes || null,
      item_type: item.item_type,
      category_name: item.category_name || null,
      unit: item.unit || null,
      tax_rate: item.tax_rate,
      discount_amount: item.discount_amount,
      package_id: item.package_id || null,
      sort_order: index,
      hsn_code: item.hsn_code || null,
    }));

    const { error: itemsError } = await adminClient.from('quotation_items').insert(itemRows);
    if (itemsError) {
      // Best-effort cleanup so a partial quotation is not left behind.
      await adminClient.from('quotations').delete().eq('id', quotation.id);
      return jsonError('Failed to save quotation items: ' + itemsError.message, 500);
    }

    await recordQuotationStatus({
      adminClient,
      quotationId: quotation.id,
      previousStatus: null,
      newStatus: initialStatus,
      actorId: profile.id,
      notes:
        initialStatus === 'pending_approval'
          ? 'Quotation submitted for manager approval'
          : initialStatus === 'approved'
            ? 'Quotation created and auto-approved'
            : 'Quotation created as draft',
      metadata: { approval_required: approvalRequired },
    });

    await logActivity({
      actorId: profile.id,
      action: 'QUOTATION_CREATED',
      entityType: 'quotation',
      entityId: quotation.id,
      metadata: {
        quotation_code: quotationCode,
        customer_id: customerId,
        lead_id: leadId,
        total_amount: totals.total_amount,
        status: initialStatus,
        price_overridden: totals.items.some((item) => item.price_overridden),
      },
    });

    const bundle = await getQuotationBundle(adminClient, quotation.id);
    return jsonResponse(bundle, {
      status: 201,
      message: initialStatus === 'pending_approval'
        ? 'Quotation created and submitted for approval.'
        : 'Quotation created.',
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonError(error.message || 'Failed to create quotation.', status);
  }
}
