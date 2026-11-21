import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess, logInstallationActivity } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * PATCH /api/v1/installation/technicians/[id]/availability
 * Allows authorized managers or technicians to update availability toggle and max daily jobs.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireInstallationAccess(request, { requireManager: true });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile } = authResult;
    const body = await request.json();

    const updatedTech = await installationStore.updateTechnicianAvailability(id, {
      is_available: body.is_available,
      max_daily_jobs: body.max_daily_jobs
    });

    await logInstallationActivity({
      actorId: profile.id,
      action: 'TECHNICIAN_AVAILABILITY_UPDATED',
      installationId: null,
      metadata: {
        technician_id: id,
        is_available: updatedTech.is_available,
        max_daily_jobs: updatedTech.max_daily_jobs
      }
    });

    return jsonResponse({
      technician: updatedTech,
      message: `Technician ${updatedTech.full_name} availability updated.`
    });
  } catch (error) {
    return jsonError(error.message, error.status || 400);
  }
}
