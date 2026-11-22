import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSurveyAccess, logSurveyActivity, createNotification } from '@/lib/supabase/surveyAuth';
import { surveyStore } from '@/lib/survey/surveyStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/survey/requests/[id]/approval
 * Workflow step: Survey reviewer approves, rejects, or requests a revisit.
 * Updates survey status and records comments.
 * Approved surveys are marked ready for Quotation workflow.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    // Approvals require manager or admin permissions
    const authResult = await requireSurveyAccess(request, { requireManage: true });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json();
    const { action, comments, revisit_notes, rejection_reason } = body;

    if (!['approve', 'reject', 'revisit', 'revision_requested'].includes(action)) {
      return jsonError('Invalid approval action. Must be approve, reject, or revisit.', 400);
    }

    let result;

    if (adminClient) {
      try {
        let newStatus = 'approved';
        let feasibilityStatus = 'approved';
        let approvalStatus = 'approved';

        if (action === 'approve') {
          newStatus = 'approved';
          feasibilityStatus = 'approved';
          approvalStatus = 'approved';
        } else if (action === 'reject') {
          newStatus = 'rejected';
          feasibilityStatus = 'rejected';
          approvalStatus = 'rejected';
        } else if (action === 'revisit' || action === 'revision_requested') {
          newStatus = 'revisit_required';
          feasibilityStatus = 'requires_review';
          approvalStatus = 'revision_requested';
        }

        const { data: srv, error: srvErr } = await adminClient
          .from('site_surveys')
          .update({
            status: newStatus,
            feasibility_status: feasibilityStatus,
            rejection_reason: action === 'reject' ? (rejection_reason || comments) : undefined,
            revisit_notes: (action === 'revisit' || action === 'revision_requested') ? (revisit_notes || comments) : undefined,
            updated_at: new Date().toISOString(),
            updated_by: profile.id
          })
          .eq('id', id)
          .select('*')
          .single();

        const { data: app, error: appErr } = await adminClient
          .from('survey_approvals')
          .insert({
            survey_id: id,
            status: approvalStatus,
            reviewed_by: profile.id,
            reviewed_at: new Date().toISOString(),
            comments: comments || `${action.toUpperCase()} by ${profile.full_name}`
          })
          .select('*')
          .single();

        if (srvErr || !srv) return jsonError('Could not update the survey: ' + (srvErr?.message || 'survey not found'), srvErr ? 400 : 404);
        if (appErr) console.error('Approval record was not saved:', appErr.message);

        // Approved: the lead is ready for a quotation (it is not "proposal sent" until one is sent).
        if (action === 'approve' && srv.lead_id) {
          await adminClient
            .from('leads')
            .update({ status: 'qualified', updated_at: new Date().toISOString() })
            .eq('id', srv.lead_id)
            .in('status', ['new', 'contacted', 'follow_up_required', 'survey_requested']);
        }

        result = { survey: srv, approval: app };
      } catch (e) {
        return jsonError('Could not review the survey: ' + (e?.message || 'unknown error'), 500);
      }
    }

    if (!result) {
      result = await surveyStore.reviewSurvey(id, {
        action,
        comments,
        revisit_notes,
        rejection_reason
      }, profile);
    }

    if (!result) {
      return jsonError('Survey not found.', 404);
    }

    await logSurveyActivity({
      actorId: profile.id,
      action: `SURVEY_${action.toUpperCase()}`,
      surveyId: id,
      metadata: { action, comments }
    });

    return jsonResponse(result, {
      message: `Survey marked as ${result.survey.status} successfully.`
    });
  } catch (error) {
    return jsonError('Failed to review survey: ' + error.message, 500);
  }
}
