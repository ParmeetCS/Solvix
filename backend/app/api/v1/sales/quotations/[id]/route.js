import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';
import { isManagerProfile } from '@/lib/supabase/roles';
import { ApiError } from '@/lib/quotation/errors';
import { calculateQuotationTotals } from '@/lib/quotation/calculations';
import { buildQuotationItems } from '@/lib/quotation/bom';
import {
  assertUuid,
  normaliseDate,
  assertSalesAccess,
  assertApprovedSurveyForQuotation,
  getQuotationBundle,
  recordQuotationStatus,
} from '@/lib/quotation/data';

export async function OPTIONS() {
  return handleOptions();
}

/** GET /api/v1/sales/quotations/[id] */
export async function GET(request, { params }) {
  try {
    const auth = await requireSalesOrAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;
    assertUuid(id, 'quotation id');
    const bundle = await getQuotationBundle(auth.adminClient, id);
    assertSalesAccess(bundle.quotation, auth.profile, auth.isAdmin);
    return jsonResponse(bundle);
  } catch (error) {
    return jsonError(error.message || 'Failed to load quotation.', error.status || 500);
  }
}

/** PATCH /api/v1/sales/quotations/[id] — edit a draft / pending quotation. */
export async function PATCH(request, { params }) {
  try {
    const auth = await requireSalesOrAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { profile, isAdmin, adminClient } = auth;
    const { id } = await params;
    assertUuid(id, 'quotation id');
    const body = await request.json();

    const { data: quotation, error } = await adminClient
      .from('quotations')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return jsonError('Failed to load quotation: ' + error.message, 500);
    if (!quotation) return jsonError('Quotation not found.', 404);
    assertSalesAccess(quotation, profile, isAdmin);

    if (!['draft', 'pending_approval'].includes(quotation.status)) {
      return jsonError('Only draft or pending-approval quotations can be edited.', 409);
    }
    if (quotation.status === 'pending_approval' && !isAdmin && !isManagerProfile(profile)) {
      return jsonError('This quotation is awaiting approval. Withdraw it before editing.', 409);
    }

    const { data: existingItems } = await adminClient
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', id)
      .order('sort_order', { ascending: true });

    const rawItems = body.items !== undefined
      ? body.items
      : (existingItems || []).map((item) => ({
          product_id: item.product_id,
          line_item: item.line_item,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          item_type: item.item_type,
          unit: item.unit,
          hsn_code: item.hsn_code,
          notes: item.notes,
        }));

    const systemType = body.system_type || quotation.system_type;
    const capacity = Number(body.system_capacity_kw ?? quotation.system_capacity_kw);
    if (!['on-grid', 'off-grid', 'hybrid'].includes(systemType)) {
      return jsonError('System type must be on-grid, off-grid or hybrid.', 400);
    }
    if (!Number.isFinite(capacity) || capacity <= 0) {
      return jsonError('System capacity must be greater than zero.', 400);
    }

    const nextLeadId = body.lead_id || quotation.lead_id;
    const nextCustomerId = body.customer_id || quotation.customer_id;

    if (nextLeadId !== quotation.lead_id || nextCustomerId !== quotation.customer_id) {
      const { data: lead } = await adminClient
        .from('leads')
        .select('id, customer_id, assigned_to, created_by')
        .eq('id', nextLeadId)
        .maybeSingle();
      if (!lead) return jsonError('Lead not found.', 404);
      if (!isAdmin && lead.assigned_to && lead.assigned_to !== profile.id && lead.created_by !== profile.id) {
        return jsonError('This lead is assigned to another sales person. Ask an Admin to reassign it to you, or choose your own lead.', 403);
      }
      if (lead.customer_id && lead.customer_id !== nextCustomerId) {
        return jsonError('The selected lead belongs to a different customer.', 400);
      }
      const { data: customer } = await adminClient
        .from('customers')
        .select('id, status')
        .eq('id', nextCustomerId)
        .maybeSingle();
      if (!customer) return jsonError('Customer not found.', 404);
      if (customer.status !== 'active') return jsonError('Customer account is not active.', 400);
    }

    const surveyId = body.site_survey_id !== undefined ? body.site_survey_id : quotation.site_survey_id;
    const survey = surveyId
      ? await assertApprovedSurveyForQuotation({
          adminClient,
          surveyId,
          leadId: nextLeadId,
          customerId: nextCustomerId,
        })
      : null;

    const packageId = body.package_id !== undefined ? body.package_id : quotation.package_id;
    const globalTaxRate = Number(body.tax_rate ?? quotation.tax_rate ?? 0);
    const built = await buildQuotationItems({
      adminClient,
      rawItems,
      packageId,
      installationCharges:
        body.installation_charges !== undefined
          ? body.installation_charges
          : quotation.installation_charges,
      otherCharges:
        body.other_charges !== undefined ? body.other_charges : quotation.other_charges,
      canOverridePricing: isAdmin || isManagerProfile(profile),
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
      discountType: body.discount_type || quotation.discount_type || 'fixed',
      discountValue:
        body.discount_value !== undefined ? body.discount_value : quotation.discount_value || 0,
      taxRate: globalTaxRate,
    });

    const discountPct =
      totals.discount_type === 'percentage'
        ? Number(totals.discount_value)
        : totals.subtotal > 0
          ? (totals.discount_amount / totals.subtotal) * 100
          : 0;
    const approvalRequired =
      body.approval_required !== undefined
        ? Boolean(body.approval_required)
        : Boolean(quotation.approval_required) || discountPct > 5 || totals.total_amount > 100000;

    const now = new Date().toISOString();
    let nextStatus = quotation.status;
    let statusNote = null;

    if (body.submit_for_approval) {
      nextStatus = approvalRequired ? 'pending_approval' : 'approved';
      statusNote = approvalRequired
        ? 'Quotation resubmitted for manager approval'
        : 'Quotation auto-approved';
    } else if (quotation.status === 'pending_approval' && !isAdmin && !isManagerProfile(profile)) {
      nextStatus = 'draft';
      statusNote = 'Quotation withdrawn to draft for editing';
    }

    const updatePayload = {
      lead_id: nextLeadId,
      customer_id: nextCustomerId,
      site_survey_id: survey?.id || null,
      survey_verified: Boolean(survey),
      package_id: packageId || null,
      system_type: systemType,
      system_capacity_kw: capacity,
      installation_address:
        body.installation_address !== undefined ? body.installation_address : quotation.installation_address,
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      discount_amount: totals.discount_amount,
      total_amount: totals.total_amount,
      installation_charges: totals.installation_charges,
      other_charges: totals.other_charges,
      tax_rate: globalTaxRate,
      discount_type: totals.discount_type,
      discount_value: totals.discount_value,
      validity_date:
        body.validity_date !== undefined
          ? normaliseDate(body.validity_date, 'validity_date')
          : quotation.validity_date,
      payment_terms: body.payment_terms !== undefined ? body.payment_terms : quotation.payment_terms,
      warranty_terms: body.warranty_terms !== undefined ? body.warranty_terms : quotation.warranty_terms,
      terms_and_conditions:
        body.terms_and_conditions !== undefined
          ? body.terms_and_conditions
          : quotation.terms_and_conditions,
      customer_notes: body.customer_notes !== undefined ? body.customer_notes : quotation.customer_notes,
      internal_notes: body.internal_notes !== undefined ? body.internal_notes : quotation.internal_notes,
      approval_required: approvalRequired,
      status: nextStatus,
      updated_by: profile.id,
      updated_at: now,
    };

    if (nextStatus === 'approved' && quotation.status !== 'approved') {
      updatePayload.approved_at = now;
      updatePayload.approved_by = profile.id;
    }

    const { data: updated, error: updateError } = await adminClient
      .from('quotations')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();
    if (updateError) return jsonError('Failed to update quotation: ' + updateError.message, 500);

    const itemRows = totals.items.map((item, index) => ({
      quotation_id: id,
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

    const { error: deleteError } = await adminClient
      .from('quotation_items')
      .delete()
      .eq('quotation_id', id);
    if (deleteError) return jsonError('Failed to replace quotation items: ' + deleteError.message, 500);

    const { error: itemsError } = await adminClient.from('quotation_items').insert(itemRows);
    if (itemsError) {
      return jsonError('Failed to save quotation items: ' + itemsError.message, 500);
    }

    if (nextStatus !== quotation.status) {
      await recordQuotationStatus({
        adminClient,
        quotationId: id,
        previousStatus: quotation.status,
        newStatus: nextStatus,
        actorId: profile.id,
        notes: statusNote || 'Quotation status updated during edit',
      });
    }

    await logActivity({
      actorId: profile.id,
      action: 'QUOTATION_UPDATED',
      entityType: 'quotation',
      entityId: id,
      metadata: {
        quotation_code: quotation.quotation_code,
        total_amount: totals.total_amount,
        status: nextStatus,
      },
    });

    const bundle = await getQuotationBundle(adminClient, id);
    return jsonResponse(bundle, { message: 'Quotation updated.' });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return jsonError(error.message || 'Failed to update quotation.', status);
  }
}

/** DELETE /api/v1/sales/quotations/[id] — draft only. */
export async function DELETE(request, { params }) {
  try {
    const auth = await requireSalesOrAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { profile, isAdmin, adminClient } = auth;
    const { id } = await params;
    assertUuid(id, 'quotation id');

    const { data: quotation } = await adminClient
      .from('quotations')
      .select('id, quotation_code, status, created_by')
      .eq('id', id)
      .maybeSingle();
    if (!quotation) return jsonError('Quotation not found.', 404);
    assertSalesAccess(quotation, profile, isAdmin);
    if (quotation.status !== 'draft') {
      return jsonError('Only draft quotations can be deleted.', 409);
    }

    const { error } = await adminClient.from('quotations').delete().eq('id', id);
    if (error) return jsonError('Failed to delete quotation: ' + error.message, 500);

    await logActivity({
      actorId: profile.id,
      action: 'QUOTATION_DELETED',
      entityType: 'quotation',
      entityId: id,
      metadata: { quotation_code: quotation.quotation_code },
    });

    return jsonResponse({ id }, { message: 'Draft quotation deleted.' });
  } catch (error) {
    return jsonError(error.message || 'Failed to delete quotation.', error.status || 500);
  }
}
