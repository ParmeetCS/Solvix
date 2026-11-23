import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess, logInstallationActivity, createInstallationNotification } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/installation/jobs/[id]/status
 * Advance or transition installation status with verification checks.
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

    if (!body.status) {
      return jsonError('Target status is required.', 400);
    }

    const before = await installationStore.getJobById(id, profile, true);
    const updatedJob = await installationStore.updateJobStatus(id, body.status, body.notes, profile);

    await logInstallationActivity({
      actorId: profile.id,
      action: `INSTALLATION_STATUS_${body.status.toUpperCase()}`,
      installationId: updatedJob.id,
      metadata: {
        installation_code: updatedJob.installation_code,
        previous_status: before?.status,
        new_status: body.status,
        notes: body.notes
      }
    });

    // Notify assigned technicians and customer
    for (const at of updatedJob.assigned_technicians || []) {
      await createInstallationNotification({
        recipientId: at.profile_id,
        title: `Installation ${updatedJob.installation_code} Status Updated`,
        message: `Project status has been updated to "${body.status.replace('_', ' ')}". ${body.notes || ''}`,
        installationId: updatedJob.id
      });
    }

    return jsonResponse({
      job: updatedJob,
      message: `Installation status successfully transitioned to "${body.status}".`
    });
  } catch (error) {
    return jsonError(error.message, error.status || 400);
  }
}
