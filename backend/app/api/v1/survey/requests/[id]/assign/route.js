import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSurveyAccess, logSurveyActivity, createNotification } from '@/lib/supabase/surveyAuth';
import { surveyStore } from '@/lib/survey/surveyStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/survey/requests/[id]/assign
 * Assigns a survey to a survey engineer, records assignment history, and updates survey status.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const authResult = await requireSurveyAccess(request, { requireManage: true, allowSalesManage: true });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json();
    const { assigned_to, scheduled_date, scheduled_time, notes } = body;

    if (!assigned_to) {
      return jsonError('Surveyor (assigned_to) is required.', 400);
    }

    let result;

    if (adminClient) {
      try {
        // Mark previous assignments inactive
        await adminClient
          .from('survey_assignments')
          .update({ is_active: false })
          .eq('survey_id', id);

        // Insert new assignment
        const { data: asg, error: asgErr } = await adminClient
          .from('survey_assignments')
          .insert({
            survey_id: id,
            assigned_to,
            assigned_by: profile.id,
            assigned_at: new Date().toISOString(),
            scheduled_at: scheduled_date ? `${scheduled_date}T10:00:00Z` : null,
            status: 'assigned',
            is_active: true,
            notes: notes || 'Survey assigned.'
          })
          .select('*')
          .single();

        // Update site survey record
        const nextStatus = scheduled_date ? 'scheduled' : 'assigned';
        const { data: srv, error: srvErr } = await adminClient
          .from('site_surveys')
          .update({
            assigned_to,
            scheduled_date: scheduled_date || null,
            scheduled_time: scheduled_time || null,
            status: nextStatus,
            updated_at: new Date().toISOString(),
            updated_by: profile.id
          })
          .eq('id', id)
          .select('*')
          .single();

        if (asgErr) return jsonError('Could not save the assignment: ' + asgErr.message, 400);
        if (!srvErr && srv) {
          result = { survey: srv, assignment: asg };
        } else if (srvErr && !/0 rows|no rows/i.test(srvErr.message || '')) {
          return jsonError('Could not update the survey: ' + srvErr.message, 400);
        }
      } catch (e) {
        return jsonError('Assignment failed: ' + (e?.message || 'unknown error'), 500);
      }
    }

    if (!result) {
      result = await surveyStore.assignSurvey(id, {
        assigned_to,
        scheduled_date,
        scheduled_time,
        notes
      }, profile);
    }

    if (!result) {
      return jsonError('Survey not found.', 404);
    }

    // Audit log
    await logSurveyActivity({
      actorId: profile.id,
      action: 'SURVEY_ASSIGNED',
      surveyId: id,
      metadata: { assigned_to, scheduled_date, scheduled_time, notes }
    });

    // Notify assigned surveyor
    await createNotification({
      recipientId: assigned_to,
      title: 'New Site Survey Assigned',
      message: `You have been assigned site survey ${result.survey.survey_code} for ${result.survey.customer_name}. Scheduled: ${scheduled_date || 'TBD'}`,
      surveyId: id
    });

    return jsonResponse(result, {
      message: `Survey assigned to engineer successfully.`
    });
  } catch (error) {
    return jsonError('Failed to assign survey: ' + error.message, 500);
  }
}
