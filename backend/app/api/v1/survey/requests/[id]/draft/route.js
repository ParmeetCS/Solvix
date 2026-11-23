import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSurveyAccess, logSurveyActivity } from '@/lib/supabase/surveyAuth';
import { sanitizeSurveyForm } from '@/lib/survey/surveyFields';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/survey/requests/[id]/draft
 * Allows surveyors to save drafts and resume incomplete surveys anytime.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireSurveyAccess(request, { targetSurveyId: id });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const rawForm = await request.json();
    const formData = sanitizeSurveyForm(rawForm);

    let survey;

    if (adminClient) {
      try {
        const { data, error } = await adminClient
          .from('site_surveys')
          .update({
            is_draft: true,
            draft_data: rawForm,
            status: 'in_progress',
            roof_area_sqm: formData.roof_area_sqm ? parseFloat(formData.roof_area_sqm) : undefined,
            roof_direction: formData.roof_direction || undefined,
            roof_tilt_degrees: formData.roof_tilt_degrees ? parseFloat(formData.roof_tilt_degrees) : undefined,
            shading_info: formData.shading_conditions || undefined,
            cable_distance_m: formData.cable_distance_m ? parseFloat(formData.cable_distance_m) : undefined,
            site_observations: formData.site_observations || undefined,
            updated_at: new Date().toISOString(),
            updated_by: profile.id
          })
          .eq('id', id)
          .select('*')
          .single();

        if (error) return jsonError('Could not save the draft: ' + error.message, 400);
        survey = data;
      } catch (e) {
        return jsonError('Could not save the draft: ' + (e?.message || 'unknown error'), 500);
      }
    }


    if (!survey) {
      return jsonError('Survey not found.', 404);
    }

    return jsonResponse(survey, { message: 'Survey inspection draft saved successfully.' });
  } catch (error) {
    return jsonError('Failed to save survey draft: ' + error.message, 500);
  }
}
