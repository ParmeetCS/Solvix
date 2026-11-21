import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { logActivity } from '@/lib/supabase/salesAuth';
import { loadStaffQuotation } from '@/lib/quotation/http';
import { rejectQuotation } from '@/lib/quotation/workflow';
import { getQuotationBundle } from '@/lib/quotation/data';

export async function OPTIONS() {
  return handleOptions();
}

/** POST /api/v1/sales/quotations/[id]/reject */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const loaded = await loadStaffQuotation(request, id);
    if (loaded.errorResponse) return loaded.errorResponse;
    const { auth, quotation } = loaded;

    if (!['sent', 'viewed'].includes(quotation.status)) {
      return jsonError('Only sent or viewed quotations can be rejected.', 409);
    }

    const body = await request.json().catch(() => ({}));
    if (!body.reason) return jsonError('A rejection reason is required.', 400);

    await rejectQuotation({
      adminClient: auth.adminClient,
      quotation,
      actorId: auth.profile.id,
      reason: body.reason,
    });

    await logActivity({
      actorId: auth.profile.id,
      action: 'QUOTATION_REJECTED',
      entityType: 'quotation',
      entityId: id,
      metadata: { quotation_code: quotation.quotation_code, reason: body.reason },
    });

    const bundle = await getQuotationBundle(auth.adminClient, id);
    return jsonResponse(bundle, { message: 'Quotation rejected.' });
  } catch (error) {
    return jsonError(error.message || 'Failed to reject quotation.', error.status || 500);
  }
}
