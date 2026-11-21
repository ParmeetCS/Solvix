import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { logActivity } from '@/lib/supabase/salesAuth';
import { isManagerProfile } from '@/lib/supabase/roles';
import { loadStaffQuotation } from '@/lib/quotation/http';
import { approveQuotation } from '@/lib/quotation/workflow';
import { getQuotationBundle } from '@/lib/quotation/data';

export async function OPTIONS() {
  return handleOptions();
}

/** POST /api/v1/sales/quotations/[id]/approve */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const loaded = await loadStaffQuotation(request, id);
    if (loaded.errorResponse) return loaded.errorResponse;
    const { auth, quotation } = loaded;

    if (!auth.isAdmin && !isManagerProfile(auth.profile)) {
      return jsonError('Manager or Administrator approval permission is required.', 403);
    }
    if (!['pending_approval', 'under_review'].includes(quotation.status)) {
      return jsonError('Only quotations pending approval can be approved.', 409);
    }

    const body = await request.json().catch(() => ({}));
    const updated = await approveQuotation({
      adminClient: auth.adminClient,
      quotation,
      actorId: auth.profile.id,
      notes: body.notes || 'Quotation approved by manager',
    });

    await logActivity({
      actorId: auth.profile.id,
      action: 'QUOTATION_APPROVED',
      entityType: 'quotation',
      entityId: id,
      metadata: { quotation_code: quotation.quotation_code, notes: body.notes || null },
    });

    const bundle = await getQuotationBundle(auth.adminClient, id);
    return jsonResponse(bundle, { message: 'Quotation approved.' });
  } catch (error) {
    return jsonError(error.message || 'Failed to approve quotation.', error.status || 500);
  }
}
