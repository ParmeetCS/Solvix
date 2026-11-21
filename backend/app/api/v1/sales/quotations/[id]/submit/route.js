import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { logActivity } from '@/lib/supabase/salesAuth';
import { loadStaffQuotation } from '@/lib/quotation/http';
import { approveQuotation, transitionQuotation } from '@/lib/quotation/workflow';
import { getQuotationBundle } from '@/lib/quotation/data';

export async function OPTIONS() {
  return handleOptions();
}

/** POST /api/v1/sales/quotations/[id]/submit */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const loaded = await loadStaffQuotation(request, id);
    if (loaded.errorResponse) return loaded.errorResponse;
    const { auth, quotation } = loaded;

    if (quotation.status !== 'draft') {
      return jsonError('Only draft quotations can be submitted.', 409);
    }

    const now = new Date().toISOString();
    let updated;
    let message;

    if (quotation.approval_required) {
      updated = await transitionQuotation({
        adminClient: auth.adminClient,
        quotation,
        newStatus: 'pending_approval',
        actorId: auth.profile.id,
        notes: 'Submitted for manager approval',
      });
      message = 'Quotation submitted for approval.';
    } else {
      updated = await approveQuotation({
        adminClient: auth.adminClient,
        quotation,
        actorId: auth.profile.id,
        notes: 'Approval not required; quotation auto-approved on submission',
      });
      message = 'Quotation approved.';
    }

    await logActivity({
      actorId: auth.profile.id,
      action: 'QUOTATION_SUBMITTED',
      entityType: 'quotation',
      entityId: id,
      metadata: {
        quotation_code: quotation.quotation_code,
        new_status: updated.status,
        approval_required: Boolean(quotation.approval_required),
      },
    });

    const bundle = await getQuotationBundle(auth.adminClient, id);
    return jsonResponse(bundle, { message });
  } catch (error) {
    return jsonError(error.message || 'Failed to submit quotation.', error.status || 500);
  }
}
