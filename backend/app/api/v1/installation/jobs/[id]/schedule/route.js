import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess, logInstallationActivity, createInstallationNotification } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/installation/jobs/[id]/schedule
 * Schedules or reschedules an installation job and prevents technician double-booking.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireInstallationAccess(request, { requireManager: true });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile } = authResult;
    const body = await request.json();

    if (!body.scheduled_start) {
      return jsonError('Scheduled start timestamp (scheduled_start) is required.', 400);
    }

    const updatedJob = await installationStore.scheduleJob(id, {
      scheduled_start: body.scheduled_start,
      expected_completion: body.expected_completion,
      notes: body.notes
    }, profile);

    await logInstallationActivity({
      actorId: profile.id,
      action: 'INSTALLATION_SCHEDULED',
      installationId: updatedJob.id,
      metadata: {
        installation_code: updatedJob.installation_code,
        scheduled_start: updatedJob.scheduled_start,
        expected_completion: updatedJob.expected_completion_date
      }
    });

    // Notify assigned team
    for (const at of updatedJob.assigned_technicians || []) {
      await createInstallationNotification({
        recipientId: at.technician_id,
        title: `Schedule Updated: ${updatedJob.installation_code}`,
        message: `Project has been scheduled for ${updatedJob.planned_installation_date}.`,
        installationId: updatedJob.id
      });
    }

    return jsonResponse({
      job: updatedJob,
      message: `Installation scheduled successfully for ${updatedJob.planned_installation_date}.`
    });
  } catch (error) {
    return jsonError(error.message, error.status || 400);
  }
}
