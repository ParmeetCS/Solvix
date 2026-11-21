import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { logActivity } from '@/lib/supabase/salesAuth';
import { loadStaffQuotation } from '@/lib/quotation/http';
import { convertQuotationToOrder } from '@/lib/quotation/workflow';
import { getQuotationBundle } from '@/lib/quotation/data';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/sales/quotations/[id]/convert
 * Idempotent conversion of an accepted quotation into an order.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const loaded = await loadStaffQuotation(request, id);
    if (loaded.errorResponse) return loaded.errorResponse;
    const { auth, quotation } = loaded;

    if (!['accepted', 'converted_to_order', 'converted'].includes(quotation.status)) {
      return jsonError('Only an accepted quotation can be converted to an order.', 409);
    }

    const conversion = await convertQuotationToOrder({
      adminClient: auth.adminClient,
      quotationId: id,
      actorId: auth.profile.id,
    });

    await logActivity({
      actorId: auth.profile.id,
      action: conversion.already_exists ? 'QUOTATION_CONVERSION_REPLAYED' : 'QUOTATION_CONVERTED',
      entityType: 'quotation',
      entityId: id,
      metadata: {
        quotation_code: quotation.quotation_code,
        order_id: conversion.order?.id,
        order_code: conversion.order?.order_code,
        already_exists: Boolean(conversion.already_exists),
      },
    });

    const bundle = await getQuotationBundle(auth.adminClient, id);
    return jsonResponse(
      { ...bundle, conversion },
      {
        message: conversion.already_exists
          ? 'Order already exists for this quotation; no duplicate was created.'
          : 'Quotation converted to an order.',
      }
    );
  } catch (error) {
    return jsonError(error.message || 'Failed to convert quotation.', error.status || 500);
  }
}
