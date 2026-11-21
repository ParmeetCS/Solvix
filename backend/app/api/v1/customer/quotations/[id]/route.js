import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { loadCustomerQuotation } from '@/lib/quotation/http';
import { markQuotationViewed } from '@/lib/quotation/workflow';
import { getQuotationBundle, sanitizeQuotationForCustomer } from '@/lib/quotation/data';
import { logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/customer/quotations/[id]
 * Returns only the authenticated customer's own quotation. Viewing a sent
 * quotation records the "viewed" workflow status.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const loaded = await loadCustomerQuotation(request, id);
    if (loaded.errorResponse) return loaded.errorResponse;
    const { auth, quotation } = loaded;

    if (quotation.status === 'sent') {
      await markQuotationViewed({
        adminClient: auth.adminClient,
        quotation,
        actorId: auth.profile.id,
      });
      await logActivity({
        actorId: auth.profile.id,
        action: 'CUSTOMER_QUOTATION_VIEWED',
        entityType: 'quotation',
        entityId: id,
        metadata: { quotation_code: quotation.quotation_code, customer_id: auth.customer.id },
      });
    }

    const bundle = await getQuotationBundle(auth.adminClient, id, { includeInternal: false });
    return jsonResponse(sanitizeQuotationForCustomer(bundle));
  } catch (error) {
    return jsonError(error.message || 'Failed to load quotation.', error.status || 500);
  }
}
