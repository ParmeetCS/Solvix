import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess, logInstallationActivity } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/installation/jobs
 * Lists installation jobs with search, status, and technician filters.
 */
export async function GET(request) {
  try {
    const authResult = await requireInstallationAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isAdmin, isTechnician } = authResult;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const technician_id = searchParams.get('technician_id') || '';
    const date = searchParams.get('date') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result = await installationStore.getJobs(
      { search, status, technician_id, date, page, limit },
      profile,
      isAdmin,
      isTechnician
    );

    return jsonResponse(result);
  } catch (error) {
    return jsonError('Error fetching installation jobs: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/installation/jobs
 * Create an installation job from an eligible confirmed order.
 */
export async function POST(request) {
  try {
    const authResult = await requireInstallationAccess(request, { requireManager: true });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile } = authResult;
    const body = await request.json();

    if (!body.order_id && !body.id) {
      return jsonError('Order reference (order_id) is required to create an installation project.', 400);
    }

    const result = await installationStore.createJobFromOrder(body, profile);

    await logInstallationActivity({
      actorId: profile.id,
      action: 'INSTALLATION_JOB_CREATED',
      installationId: result.job.id,
      metadata: {
        installation_code: result.job.installation_code,
        order_code: result.job.order_code,
        customer_name: result.job.customer_name,
        system_capacity_kw: result.job.system_capacity_kw
      }
    });

    return jsonResponse(result, {
      status: result.already_exists ? 200 : 201,
      message: result.message
    });
  } catch (error) {
    return jsonError('Error creating installation job: ' + error.message, 500);
  }
}
