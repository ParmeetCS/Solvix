import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess, logInstallationActivity } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/installation/jobs/[id]
 * Retrieves comprehensive installation job bundle.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireInstallationAccess(request, { targetJobId: id });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, canManage: isAdmin } = authResult;
    const job = await installationStore.getJobById(id, profile, isAdmin);

    if (!job) {
      return jsonError(`Installation job ${id} not found.`, 404);
    }

    return jsonResponse({ job });
  } catch (error) {
    return jsonError(error.message, error.status || 500);
  }
}

/**
 * PATCH /api/v1/installation/jobs/[id]
 * Update general job metadata / notes.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireInstallationAccess(request, { targetJobId: id });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, canManage: isAdmin } = authResult;
    const existing = await installationStore.getJobById(id, profile, isAdmin);
    if (!existing) return jsonError(`Installation job ${id} not found.`, 404);

    const body = await request.json();
    const job = await installationStore.updateJobMeta(existing.id, { notes: body.notes, site_address: body.site_address }, profile);

    await logInstallationActivity({
      actorId: profile.id,
      action: 'INSTALLATION_METADATA_UPDATED',
      installationId: job.id,
      metadata: { notes: body.notes }
    });

    return jsonResponse({ job, message: 'Installation updated successfully.' });
  } catch (error) {
    return jsonError(error.message, error.status || 500);
  }
}
