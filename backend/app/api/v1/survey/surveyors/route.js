import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSurveyAccess } from '@/lib/supabase/surveyAuth';
import { surveyStore } from '@/lib/survey/surveyStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/survey/surveyors
 * Returns list of survey engineers with their current active workload and completed surveys.
 */
export async function GET(request) {
  try {
    const authResult = await requireSurveyAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;

    if (adminClient) {
      try {
        const { data: surveyors } = await adminClient
          .from('profiles')
          .select('id, full_name, email, phone')
          .eq('account_type', 'employee');

        if (surveyors && surveyors.length > 0) {
          return jsonResponse({ surveyors });
        }
      } catch (e) {
        // Fall back
      }
    }

    const surveyors = await surveyStore.getSurveyors();
    return jsonResponse({ surveyors });
  } catch (error) {
    return jsonError('Failed to fetch surveyors: ' + error.message, 500);
  }
}
