import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess, logInstallationActivity } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/installation/jobs/[id]/equipment-verify
 * Verifies delivered equipment serial numbers from Warehouse records before installation starts.
 * Records missing/damaged items or authorized exception notes.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireInstallationAccess(request, { targetJobId: id });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile } = authResult;
    const body = await request.json();

    const result = await installationStore.verifyEquipment(id, {
      verified_serials: body.verified_serials || [],
      missing_items: body.missing_items || [],
      damaged_items: body.damaged_items || [],
      exception_recorded: Boolean(body.exception_recorded),
      exception_notes: body.exception_notes || null
    }, profile);

    await logInstallationActivity({
      actorId: profile.id,
      action: 'INSTALLATION_EQUIPMENT_VERIFIED',
      installationId: id,
      metadata: {
        verified_count: (body.verified_serials || []).length,
        exception_recorded: result.exception_recorded
      }
    });

    return jsonResponse(result, {
      message: result.exception_recorded 
        ? 'Equipment verification saved with recorded authorized exception.' 
        : 'Delivered equipment serial numbers verified successfully.'
    });
  } catch (error) {
    return jsonError(error.message, error.status || 400);
  }
}
