import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess, logInstallationActivity } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/installation/jobs/[id]/tasks
 * Lists digital checklist tasks for this installation job.
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
      tasks: job.tasks || [],
      installation_code: job.installation_code,
      completedCount: (job.tasks || []).filter(t => t.is_completed).length,
      totalCount: (job.tasks || []).length
    });
  } catch (error) {
    return jsonError(error.message, error.status || 500);
  }
}

/**
 * POST /api/v1/installation/jobs/[id]/tasks
 * Update checklist task completion status, remarks, or photo path.
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

    if (!body.task_id && !body.taskId && !body.task_name) {
      return jsonError('Task ID or task name is required.', 400);
    }

    const taskId = body.task_id || body.taskId || body.task_name;
    const result = await installationStore.updateTask(id, taskId, {
      is_completed: body.is_completed,
      remarks: body.remarks,
      photo_storage_path: body.photo_storage_path
    }, profile);

    await logInstallationActivity({
      actorId: profile.id,
      action: 'INSTALLATION_TASK_UPDATED',
      installationId: id,
      metadata: {
        task_id: taskId,
        is_completed: body.is_completed,
        progressPct: result.progressPct
      }
    });

    return jsonResponse(result, {
      message: `Task "${result.task?.task_name}" updated successfully.`
    });
  } catch (error) {
    return jsonError(error.message, error.status || 400);
  }
}
