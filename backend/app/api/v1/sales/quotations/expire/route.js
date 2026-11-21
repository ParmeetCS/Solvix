import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';
import { isManagerProfile } from '@/lib/supabase/roles';
import { expireQuotations } from '@/lib/quotation/workflow';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/sales/quotations/expire
 * Maintenance endpoint for managers/admins (or a scheduled job) to expire
 * quotations whose validity date has passed.
 */
export async function POST(request) {
  try {
    const auth = await requireSalesOrAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    if (!auth.isAdmin && !isManagerProfile(auth.profile)) {
      return jsonError('Manager or Administrator permission is required.', 403);
    }

    const count = await expireQuotations({
      adminClient: auth.adminClient,
      actorId: auth.profile.id,
    });

    await logActivity({
      actorId: auth.profile.id,
      action: 'QUOTATIONS_EXPIRED',
      entityType: 'quotation',
      metadata: { expired_count: count },
    });

    return jsonResponse({ expired_count: count }, {
      message: count === 0 ? 'No quotations needed expiry.' : `${count} quotation(s) expired.`,
    });
  } catch (error) {
    return jsonError(error.message || 'Failed to expire quotations.', error.status || 500);
  }
}
