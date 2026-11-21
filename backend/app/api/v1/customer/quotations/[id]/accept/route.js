import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { loadCustomerQuotation } from '@/lib/quotation/http';
import { acceptQuotation, convertQuotationToOrder } from '@/lib/quotation/workflow';
import { getQuotationBundle, sanitizeQuotationForCustomer } from '@/lib/quotation/data';
import { logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/customer/quotations/[id]/accept
 * Secure customer acceptance. The customer is resolved from the bearer token,
 * never from a URL/body customer id. Acceptance creates the order atomically
 * through the idempotent conversion RPC.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const loaded = await loadCustomerQuotation(request, id);
    if (loaded.errorResponse) return loaded.errorResponse;
    const { auth, quotation } = loaded;

    if (!['sent', 'viewed'].includes(quotation.status)) {
      return jsonError('This quotation is not open for customer acceptance.', 409);
    }

    const body = await request.json().catch(() => ({}));
    const comment = String(body.comment || '').trim();

    const accepted = await acceptQuotation({
      adminClient: auth.adminClient,
      quotation,
      actorId: auth.profile.id,
      notes: comment || 'Quotation accepted by customer',
      customerUserId: auth.profile.id,
    });

    if (comment) {
      await auth.adminClient.from('quotation_comments').insert({
        quotation_id: id,
        author_profile_id: auth.profile.id,
        author_type: 'customer',
        message: comment,
        is_internal: false,
      });
    }

    let conversion = null;
    let conversionWarning = null;
    try {
      conversion = await convertQuotationToOrder({
        adminClient: auth.adminClient,
        quotationId: id,
        actorId: auth.profile.id,
      });
    } catch (conversionError) {
      conversionWarning = conversionError.message;
    }

    await logActivity({
      actorId: auth.profile.id,
      action: 'CUSTOMER_QUOTATION_ACCEPTED',
      entityType: 'quotation',
      entityId: id,
      metadata: {
        quotation_code: quotation.quotation_code,
        customer_id: auth.customer.id,
        accepted_status: accepted.status,
        order_id: conversion?.order?.id || null,
        conversion_warning: conversionWarning,
      },
    });

    const bundle = await getQuotationBundle(auth.adminClient, id, { includeInternal: false });
    return jsonResponse(
      {
        ...sanitizeQuotationForCustomer(bundle),
        conversion,
        conversion_warning: conversionWarning,
      },
      {
        message: conversionWarning
          ? 'Quotation accepted. Your SOLVIX representative will confirm the order shortly.'
          : 'Quotation accepted. Your order has been created.',
      }
    );
  } catch (error) {
    return jsonError(error.message || 'Failed to accept quotation.', error.status || 500);
  }
}
