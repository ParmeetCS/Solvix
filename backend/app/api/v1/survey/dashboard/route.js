import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSurveyAccess, logSurveyActivity } from '@/lib/supabase/surveyAuth';
import { surveyStore } from '@/lib/survey/surveyStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/survey/dashboard
 * Aggregates site survey KPIs, charts, recent assignments, and upcoming visits.
 */
export async function GET(request) {
  try {
    const authResult = await requireSurveyAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;

    // If Supabase adminClient is connected, we can query live site_surveys
    if (adminClient) {
      try {
        const { data: surveys, error: srvErr } = await adminClient
          .from('site_surveys')
          .select('*');

        if (!srvErr && surveys && surveys.length > 0) {
          const todayStr = new Date().toISOString().split('T')[0];
          const totalRequests = surveys.length;
          const pending = surveys.filter(s => s.status === 'pending').length;
          const assigned = surveys.filter(s => s.status === 'assigned').length;
          const inProgress = surveys.filter(s => s.status === 'in_progress').length;
          const submitted = surveys.filter(s => s.status === 'submitted').length;
          const approved = surveys.filter(s => s.status === 'approved').length;
          const rejected = surveys.filter(s => s.status === 'rejected').length;
          const revisitRequired = surveys.filter(s => s.status === 'revisit_required').length;
          const scheduledToday = surveys.filter(s => s.scheduled_date === todayStr || s.survey_date === todayStr).length;

          const statusDistribution = [
            { name: 'Pending', count: pending, color: '#f59e0b' },
            { name: 'Assigned', count: assigned, color: '#3b82f6' },
            { name: 'Scheduled Today', count: scheduledToday, color: '#06b6d4' },
            { name: 'In Progress', count: inProgress, color: '#8b5cf6' },
            { name: 'Submitted', count: submitted, color: '#ec4899' },
            { name: 'Approved', count: approved, color: '#10b981' },
            { name: 'Rejected', count: rejected, color: '#ef4444' },
            { name: 'Revisit Required', count: revisitRequired, color: '#f97316' },
          ];

          const { data: assignments } = await adminClient
            .from('survey_assignments')
            .select(`
              *,
              assigned_to_profile:assigned_to ( id, full_name, email ),
              site_surveys:survey_id ( id, survey_code, customer_name, site_address, priority )
            `)
            .order('assigned_at', { ascending: false })
            .limit(5);

          const { data: surveyors } = await adminClient
            .from('profiles')
            .select('id, full_name, email, phone')
            .eq('account_type', 'employee');

          return jsonResponse({
            kpis: {
              totalRequests,
              pending,
              assigned,
              scheduledToday,
              inProgress,
              submitted,
              approved,
              rejected,
              revisitRequired
            },
            statusDistribution,
            recentAssignments: (assignments || []).map(a => ({
              ...a,
              survey_code: a.site_surveys?.survey_code,
              customer_name: a.site_surveys?.customer_name,
              site_address: a.site_surveys?.site_address,
              priority: a.site_surveys?.priority,
              assigned_to_name: a.assigned_to_profile?.full_name
            })),
            upcomingSurveys: surveys.filter(s => s.scheduled_date).slice(0, 5),
            surveyorsWorkload: surveyors || []
          });
        }
      } catch (dbErr) {
        // Fall back to memory store
      }
    }

    const data = await surveyStore.getDashboardMetrics();
    return jsonResponse(data);
  } catch (error) {
    return jsonError('Failed to fetch survey dashboard: ' + error.message, 500);
  }
}
