import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSurveyAccess, logSurveyActivity } from '@/lib/supabase/surveyAuth';
import { loadSurveyDetail, photoView } from '@/lib/survey/surveyDb';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/survey/requests/[id]
 * Retrieves survey details including photos, report, and approvals.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireSurveyAccess(request, { targetSurveyId: id });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;

    const detail = await loadSurveyDetail(adminClient, id);
    if (!detail) {
      return jsonError('Survey request not found.', 404);
    }

    return jsonResponse(detail);
  } catch (error) {
    return jsonError('Failed to fetch survey request: ' + error.message, 500);
  }
}

/**
 * PATCH /api/v1/survey/requests/[id]
 * Update survey fields (priority, status, notes, address)
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireSurveyAccess(request, { targetSurveyId: id });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json();

    let updatedSurvey;

    if (adminClient) {
      try {
        const { data, error } = await adminClient
          .from('site_surveys')
          .update({
            ...body,
            updated_at: new Date().toISOString(),
            updated_by: profile.id
          })
          .eq('id', id)
          .select('*')
          .single();

        if (error) return jsonError('Could not update the survey: ' + error.message, 400);
        updatedSurvey = data;
      } catch (e) {
        return jsonError('Could not update the survey: ' + (e?.message || 'unknown error'), 500);
      }
    }


    if (!updatedSurvey) {
      return jsonError('Survey not found.', 404);
    }

    await logSurveyActivity({
      actorId: profile.id,
      action: 'SURVEY_UPDATED',
      surveyId: id,
      metadata: { updates: Object.keys(body) }
    });

    return jsonResponse(updatedSurvey, { message: 'Survey updated successfully.' });
  } catch (error) {
    return jsonError('Failed to update survey: ' + error.message, 500);
  }
}
