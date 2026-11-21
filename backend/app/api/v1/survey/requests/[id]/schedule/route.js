import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSurveyAccess, logSurveyActivity } from '@/lib/supabase/surveyAuth';
import { surveyStore } from '@/lib/survey/surveyStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/survey/requests/[id]/schedule
 * Schedules or reschedules the site visit date, time slot, and site address.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireSurveyAccess(request, { requireManage: false, targetSurveyId: id });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json();
    const { scheduled_date, scheduled_time, site_address, notes } = body;

    if (!scheduled_date) {
      return jsonError('Scheduled date is required.', 400);
    }

    let survey;

    if (adminClient) {
      try {
        const { data, error } = await adminClient
          .from('site_surveys')
          .update({
            scheduled_date,
            survey_date: scheduled_date,
            scheduled_time: scheduled_time || null,
            site_address: site_address || undefined,
            status: 'scheduled',
            updated_at: new Date().toISOString(),
            updated_by: profile.id
          })
          .eq('id', id)
          .select('*')
          .single();

        if (!error && data) {
          survey = data;
          // Record in assignments log
          await adminClient.from('survey_assignments').insert({
            survey_id: id,
            assigned_to: data.assigned_to || profile.id,
            assigned_by: profile.id,
            assigned_at: new Date().toISOString(),
            scheduled_at: `${scheduled_date}T10:00:00Z`,
            status: 'rescheduled',
            notes: notes || 'Visit scheduled / rescheduled.'
          });
        }
      } catch (e) {
        // Fall back
      }
    }

    if (!survey) {
      survey = await surveyStore.scheduleSurvey(id, { scheduled_date, scheduled_time, site_address }, profile);
    }

    if (!survey) {
      return jsonError('Survey not found.', 404);
    }

    await logSurveyActivity({
      actorId: profile.id,
      action: 'SURVEY_SCHEDULED',
      surveyId: id,
      metadata: { scheduled_date, scheduled_time, site_address }
    });

    return jsonResponse(survey, { message: 'Site survey visit scheduled successfully.' });
  } catch (error) {
    return jsonError('Failed to schedule survey: ' + error.message, 500);
  }
}
