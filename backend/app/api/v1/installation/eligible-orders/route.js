import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/installation/eligible-orders
 * Returns confirmed / ready-for-install orders eligible for installation job generation.
 */
export async function GET(request) {
  try {
    const authResult = await requireInstallationAccess(request, { requireManager: true });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const eligible = await installationStore.getEligibleOrders();
    return jsonResponse({ orders: eligible });
  } catch (error) {
    return jsonError('Error fetching eligible orders: ' + error.message, 500);
  }
}
