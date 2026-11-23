import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess, logInstallationActivity } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/installation/jobs/[id]/photos
 * Lists all installation photographs and evidence associated with the job.
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
    if (!job) return jsonError(`Installation job ${id} not found.`, 404);

    return jsonResponse({
      photos: job.photos || [],
      installation_code: job.installation_code,
      totalPhotos: (job.photos || []).length
    });
  } catch (error) {
    return jsonError(error.message, error.status || 500);
  }
}

/**
 * POST /api/v1/installation/jobs/[id]/photos
 * Uploads an installation photograph (pre_install, progress, panel, inverter, earthing, wiring, completion).
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

    const result = await installationStore.uploadPhoto(id, {
      photo_type: body.photo_type || 'progress',
      storage_path: body.storage_path,
      caption: body.caption,
      base64: body.base64
    }, profile);

    await logInstallationActivity({
      actorId: profile.id,
      action: 'INSTALLATION_PHOTO_UPLOADED',
      installationId: id,
      metadata: {
        photo_id: result.photo?.id,
        photo_type: body.photo_type
      }
    });

    return jsonResponse(result, {
      status: 201,
      message: 'Installation photograph uploaded successfully.'
    });
  } catch (error) {
    return jsonError(error.message, error.status || 400);
  }
}
