import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/installation/technicians/[id]
 * Retrieves technician details, skills, certifications, and assignment history.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireInstallationAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const technician = await installationStore.getTechnicianById(id);
    if (!technician) {
      return jsonError(`Technician ${id} not found.`, 404);
    }

    return jsonResponse({ technician });
  } catch (error) {
    return jsonError(error.message, 500);
  }
}
