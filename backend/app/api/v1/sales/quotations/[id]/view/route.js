import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { logActivity } from '@/lib/supabase/salesAuth';
import { loadStaffQuotation } from '@/lib/quotation/http';
import { markQuotationViewed } from '@/lib/quotation/workflow';
import { getQuotationBundle } from '@/lib/quotation/data';

export async function OPTIONS() {
  return handleOptions();
}

/** POST /api/v1/sales/quotations/[id]/view — record that the customer viewed it. */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const loaded = await loadStaffQuotation(request, id);
    if (loaded.errorResponse) return loaded.errorResponse;
    const { auth, quotation } = loaded;

    if (quotation.status !== 'sent' && quotation.status !== 'viewed') {
      return jsonError('Only sent quotations can be marked as viewed.', 409);
    }

    if (quotation.status === 'sent') {
      await markQuotationViewed({
        adminClient: auth.adminClient,
        quotation,
        actorId: auth.profile.id,
      });

      await logActivity({
        actorId: auth.profile.id,
        action: 'QUOTATION_VIEWED',
        entityType: 'quotation',
        entityId: id,
        metadata: { quotation_code: quotation.quotation_code },
      });
    }

    const bundle = await getQuotationBundle(auth.adminClient, id);
    return jsonResponse(bundle, { message: 'Quotation marked as viewed.' });
  } catch (error) {
    return jsonError(error.message || 'Failed to mark quotation viewed.', error.status || 500);
  }
}
