import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSurveyAccess } from '@/lib/supabase/surveyAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/survey/requests/[id]/history
 * Returns the timeline of assignments, status transitions, and reviews.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireSurveyAccess(request, { targetSurveyId: id });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;

    if (adminClient) {
      try {
        const { data: logs } = await adminClient
          .from('activity_logs')
          .select('*')
          .eq('entity_id', id)
          .order('created_at', { ascending: false });

        return jsonResponse({ history: logs || [] });
      } catch (e) {
        return jsonError('Failed to fetch survey history: ' + e.message, 500);
      }
    }

    return jsonResponse({ history: [] });
  } catch (error) {
    return jsonError('Failed to fetch survey history: ' + error.message, 500);
  }
}
