import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { logActivity } from '@/lib/supabase/salesAuth';
import { loadStaffQuotation } from '@/lib/quotation/http';
import { acceptQuotation, convertQuotationToOrder } from '@/lib/quotation/workflow';
import { getQuotationBundle } from '@/lib/quotation/data';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/sales/quotations/[id]/accept
 * Sales/Admin records acceptance on behalf of the customer. Acceptance also
 * creates the associated order through the idempotent conversion RPC.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const loaded = await loadStaffQuotation(request, id);
    if (loaded.errorResponse) return loaded.errorResponse;
    const { auth, quotation } = loaded;

    if (!['sent', 'viewed'].includes(quotation.status)) {
      return jsonError('Only sent or viewed quotations can be accepted.', 409);
    }

    const body = await request.json().catch(() => ({}));
    const accepted = await acceptQuotation({
      adminClient: auth.adminClient,
      quotation,
      actorId: auth.profile.id,
      notes: body.notes || 'Customer acceptance recorded by Sales',
      customerUserId: auth.profile.id,
    });

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
      action: 'QUOTATION_ACCEPTED',
      entityType: 'quotation',
      entityId: id,
      metadata: {
        quotation_code: quotation.quotation_code,
        accepted_status: accepted.status,
        order_id: conversion?.order?.id || null,
        conversion_warning: conversionWarning,
      },
    });

    const bundle = await getQuotationBundle(auth.adminClient, id);
    return jsonResponse(
      { ...bundle, conversion },
      {
        message: conversionWarning
          ? 'Quotation accepted, but order conversion needs to be retried.'
          : 'Quotation accepted and converted to an order.',
      }
    );
  } catch (error) {
    return jsonError(error.message || 'Failed to accept quotation.', error.status || 500);
  }
}
