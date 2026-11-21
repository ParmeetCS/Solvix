import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess, logInstallationActivity, createInstallationNotification } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/installation/jobs/[id]/report
 * Retrieves the compiled completion report for the installation job.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireInstallationAccess(request, { targetJobId: id });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isAdmin } = authResult;
    const job = await installationStore.getJobById(id, profile, isAdmin);
    if (!job) return jsonError(`Installation job ${id} not found.`, 404);

    return jsonResponse({
      job,
      completion_report: job.completion_report,
      isCompleted: job.status === 'completed'
    });
  } catch (error) {
    return jsonError(error.message, error.status || 500);
  }
}

/**
 * POST /api/v1/installation/jobs/[id]/report
 * Validates all completion prerequisites and generates the official completion report.
 * Seals the project and transitions status to 'completed'.
 * NOTE: Warranty start dates remain strictly tied to equipment delivery as required.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireInstallationAccess(request, { targetJobId: id });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile } = authResult;
    const result = await installationStore.generateCompletionReport(id, profile);

    await logInstallationActivity({
      actorId: profile.id,
      action: 'INSTALLATION_COMPLETION_REPORT_GENERATED',
      installationId: id,
      metadata: {
        installation_code: result.job.installation_code,
        status: 'completed',
        completed_at: result.job.actual_end
      }
    });

    // Notify operations and customer
    for (const at of result.job.assigned_technicians || []) {
      await createInstallationNotification({
        recipientId: at.technician_id,
        title: `Project ${result.job.installation_code} Completed!`,
        message: `Installation report successfully generated and verified.`,
        installationId: result.job.id
      });
    }

    return jsonResponse(result, {
      message: `Installation completion report generated successfully. Project marked as COMPLETED.`
    });
  } catch (error) {
    return jsonError(error.message, error.status || 400);
  }
}
