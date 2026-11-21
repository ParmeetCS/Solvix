import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { loadCustomerQuotation } from '@/lib/quotation/http';
import { rejectQuotation } from '@/lib/quotation/workflow';
import { getQuotationBundle, sanitizeQuotationForCustomer } from '@/lib/quotation/data';
import { logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/** POST /api/v1/customer/quotations/[id]/reject */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const loaded = await loadCustomerQuotation(request, id);
    if (loaded.errorResponse) return loaded.errorResponse;
    const { auth, quotation } = loaded;

    if (!['sent', 'viewed'].includes(quotation.status)) {
      return jsonError('This quotation is not open for customer rejection.', 409);
    }

    const body = await request.json().catch(() => ({}));
    const reason = String(body.reason || '').trim();
    if (!reason) return jsonError('Please provide a reason for rejecting the quotation.', 400);

    await rejectQuotation({
      adminClient: auth.adminClient,
      quotation,
      actorId: auth.profile.id,
      reason,
    });

    await auth.adminClient.from('quotation_comments').insert({
      quotation_id: id,
      author_profile_id: auth.profile.id,
      author_type: 'customer',
      message: reason,
      is_internal: false,
    });

    await logActivity({
      actorId: auth.profile.id,
      action: 'CUSTOMER_QUOTATION_REJECTED',
      entityType: 'quotation',
      entityId: id,
      metadata: {
        quotation_code: quotation.quotation_code,
        customer_id: auth.customer.id,
        reason,
      },
    });

    const bundle = await getQuotationBundle(auth.adminClient, id, { includeInternal: false });
    return jsonResponse(sanitizeQuotationForCustomer(bundle), { message: 'Quotation rejected.' });
  } catch (error) {
    return jsonError(error.message || 'Failed to reject quotation.', error.status || 500);
  }
}
