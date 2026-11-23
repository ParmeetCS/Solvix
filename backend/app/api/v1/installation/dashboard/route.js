import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/installation/dashboard
 * Aggregates installation project KPIs, status distributions, upcoming visits, technician workloads, and recent activities.
 */
export async function GET(request) {
  try {
    const authResult = await requireInstallationAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const data = await installationStore.getDashboardMetrics();
    return jsonResponse(data);
  } catch (error) {
    return jsonError('Failed to fetch installation dashboard: ' + error.message, 500);
  }
}
