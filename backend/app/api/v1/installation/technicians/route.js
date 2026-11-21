import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/installation/technicians
 * Lists all technicians with availability, contact details, active assignments, and workload metrics.
 */
export async function GET(request) {
  try {
    const authResult = await requireInstallationAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const technicians = await installationStore.getTechnicians();
    return jsonResponse({ technicians });
  } catch (error) {
    return jsonError('Error fetching technicians: ' + error.message, 500);
  }
}
