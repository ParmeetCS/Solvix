import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSurveyAccess } from '@/lib/supabase/surveyAuth';
import { surveyStore } from '@/lib/survey/surveyStore';

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

        if (logs && logs.length > 0) {
          return jsonResponse({ history: logs });
        }
      } catch (e) {
        // Fall back
      }
    }

    const detail = await surveyStore.getSurveyById(id);
    if (!detail) {
      return jsonError('Survey request not found.', 404);
    }

    const historyEvents = [];

    // Creation event
    historyEvents.push({
      id: 'h-1',
      action: 'SURVEY_REQUEST_CREATED',
      actor_name: 'Sales Department',
      timestamp: detail.survey.created_at,
      details: `Survey requested for ${detail.survey.customer_name}. Code: ${detail.survey.survey_code}`
    });

    // Assignments
    (detail.assignments || []).forEach(asg => {
      historyEvents.push({
        id: `h-asg-${asg.id}`,
        action: 'SURVEY_ASSIGNED',
        actor_name: asg.assigned_by_name || 'Survey Manager',
        timestamp: asg.assigned_at,
        details: `Assigned to ${asg.assigned_to_name}. Scheduled: ${asg.scheduled_at ? new Date(asg.scheduled_at).toLocaleDateString() : 'TBD'}`
      });
    });

    // Submission event if submitted
    if (detail.survey.completed_at) {
      historyEvents.push({
        id: 'h-sub',
        action: 'SURVEY_INSPECTION_SUBMITTED',
        actor_name: detail.survey.assigned_to_name || 'Field Surveyor',
        timestamp: detail.survey.completed_at,
        details: `Technical survey inspection submitted with recommended capacity of ${detail.survey.recommended_capacity_kw || 10} kW.`
      });
    }

    // Approvals
    (detail.approvals || []).forEach(app => {
      historyEvents.push({
        id: `h-app-${app.id}`,
        action: `SURVEY_${app.status.toUpperCase()}`,
        actor_name: app.reviewer_name || 'Technical Reviewer',
        timestamp: app.reviewed_at,
        details: `${app.comments || 'Review recorded'}`
      });
    });

    historyEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return jsonResponse({ history: historyEvents });
  } catch (error) {
    return jsonError('Failed to fetch survey history: ' + error.message, 500);
  }
}
