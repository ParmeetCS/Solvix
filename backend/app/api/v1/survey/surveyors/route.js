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
        const { data: staff } = await adminClient
          .from('profiles')
          .select('id, full_name, email, phone, is_active, department:department_id ( name, code )')
          .eq('account_type', 'employee')
          .eq('is_active', true)
          .not('department_id', 'is', null);

        const people = staff || [];
        const fieldTeam = people.filter((p) => /survey|install|technic/i.test(`${p.department?.code || ''} ${p.department?.name || ''}`));
        const surveyors = (fieldTeam.length > 0 ? fieldTeam : people).map((p) => ({
          id: p.id, full_name: p.full_name, email: p.email, phone: p.phone, department: p.department?.name || null,
        }));

        if (surveyors.length > 0) {
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
