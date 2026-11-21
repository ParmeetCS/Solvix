import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess, logInstallationActivity } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/installation/jobs/[id]/signature
 * Records customer digital acknowledgement / signature evidence.
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

    if (!body.signature_data) {
      return jsonError('Customer digital signature data is required.', 400);
    }

    const result = await installationStore.submitCustomerSignature(id, {
      customer_name: body.customer_name,
      signature_data: body.signature_data,
      consent_text: body.consent_text
    }, profile);

    await logInstallationActivity({
      actorId: profile.id,
      action: 'INSTALLATION_CUSTOMER_SIGNATURE_RECORDED',
      installationId: id,
      metadata: {
        customer_name: body.customer_name || result.job?.customer_name
      }
    });

    return jsonResponse(result, {
      message: 'Customer acknowledgement signature recorded successfully.'
    });
  } catch (error) {
    return jsonError(error.message, error.status || 400);
  }
}
