import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { logActivity } from '@/lib/supabase/salesAuth';
import { loadStaffQuotation } from '@/lib/quotation/http';
import { sendQuotation } from '@/lib/quotation/workflow';
import { getQuotationBundle } from '@/lib/quotation/data';

export async function OPTIONS() {
  return handleOptions();
}

/** POST /api/v1/sales/quotations/[id]/send */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const loaded = await loadStaffQuotation(request, id);
    if (loaded.errorResponse) return loaded.errorResponse;
    const { auth, quotation } = loaded;

    if (quotation.status !== 'approved') {
      return jsonError('Only approved quotations can be sent.', 409);
    }

    const body = await request.json().catch(() => ({}));
    await sendQuotation({
      adminClient: auth.adminClient,
      quotation,
      actorId: auth.profile.id,
      notes: body.notes || 'Quotation sent to customer',
    });

    await logActivity({
      actorId: auth.profile.id,
      action: 'QUOTATION_SENT',
      entityType: 'quotation',
      entityId: id,
      metadata: { quotation_code: quotation.quotation_code },
    });

    const bundle = await getQuotationBundle(auth.adminClient, id);
    return jsonResponse(bundle, { message: 'Quotation marked as sent.' });
  } catch (error) {
    return jsonError(error.message || 'Failed to send quotation.', error.status || 500);
  }
}
