import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSurveyAccess, logSurveyActivity } from '@/lib/supabase/surveyAuth';
import { surveyStore } from '@/lib/survey/surveyStore';

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

    if (adminClient) {
      try {
        const { data: survey, error } = await adminClient
          .from('site_surveys')
          .select(`
            *,
            assigned_profile:assigned_to ( id, full_name, email, phone ),
            lead:lead_id ( id, lead_code, customer_name, phone, email, address, expected_capacity_kw ),
            customer:customer_id ( id, customer_code, contact_name, phone, email )
          `)
          .eq('id', id)
          .single();

        if (!error && survey) {
          const [assignmentsRes, photosRes, reportsRes, approvalsRes] = await Promise.all([
            adminClient.from('survey_assignments').select('*').eq('survey_id', id).order('assigned_at', { ascending: false }),
            adminClient.from('survey_photos').select('*').eq('survey_id', id).order('uploaded_at', { ascending: false }),
            adminClient.from('survey_reports').select('*').eq('survey_id', id).order('created_at', { ascending: false }),
            adminClient.from('survey_approvals').select('*').eq('survey_id', id).order('created_at', { ascending: false })
          ]);

          return jsonResponse({
            survey,
            assignments: assignmentsRes.data || [],
            photos: photosRes.data || [],
            report: (reportsRes.data && reportsRes.data[0]) || null,
            approvals: approvalsRes.data || []
          });
        }
      } catch (e) {
        // Fall back
      }
    }

    const detail = await surveyStore.getSurveyById(id);
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

        if (!error && data) {
          updatedSurvey = data;
        }
      } catch (e) {
        // Fall back
      }
    }

    if (!updatedSurvey) {
      updatedSurvey = await surveyStore.updateSurvey(id, body, profile);
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
