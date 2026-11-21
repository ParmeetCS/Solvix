import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess, logInstallationActivity, createInstallationNotification } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/installation/jobs/[id]/assign
 * Assigns one or more technicians to a project and designates lead technician.
 * Prevents double-booking where technician is already at capacity.
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

    const result = await installationStore.assignTechnicians(id, {
      assignments: body.assignments,
      scheduled_start: body.scheduled_start,
      expected_completion: body.expected_completion,
      notes: body.notes
    }, profile);

    await logInstallationActivity({
      actorId: profile.id,
      action: 'INSTALLATION_TECHNICIANS_ASSIGNED',
      installationId: id,
      metadata: {
        installation_code: result.job.installation_code,
        assigned_count: result.assignments.length,
        scheduled_start: result.job.scheduled_start
      }
    });

    // Notify assigned technicians
    for (const at of result.assignments) {
      await createInstallationNotification({
        recipientId: at.technician_id,
        title: `Assigned to Installation Project ${result.job.installation_code}`,
        message: `You have been assigned as ${at.role_on_job.replace('_', ' ')} for ${result.job.customer_name} (${result.job.system_capacity_kw}kW).`,
        installationId: result.job.id
      });
    }

    return jsonResponse(result, {
      message: `Technicians assigned successfully to ${result.job.installation_code}.`
    });
  } catch (error) {
    return jsonError(error.message, error.status || 400);
  }
}
