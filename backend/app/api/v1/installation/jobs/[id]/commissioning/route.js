import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess, logInstallationActivity } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/installation/jobs/[id]/commissioning
 * Submits structured testing and commissioning readings.
 * Captures verified electrical measurements (Voc, Isc, Grid V, Earth resistance, Insulation test).
 * Contains technical safety disclaimer and requires verified values.
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

    const result = await installationStore.submitCommissioning(id, body, profile);

    await logInstallationActivity({
      actorId: profile.id,
      action: 'INSTALLATION_COMMISSIONING_SUBMITTED',
      installationId: id,
      metadata: {
        inverter_model: body.inverter_model,
        earthing_resistance_ohm: body.earthing_resistance_ohm,
        insulation_test_result: body.insulation_test_result
      }
    });

    return jsonResponse(result, {
      message: 'System testing & commissioning data recorded successfully.'
    });
  } catch (error) {
    return jsonError(error.message, error.status || 400);
  }
}
