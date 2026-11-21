import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/sales/surveys
 * Approved (or all) site surveys available for quotation creation.
 * Query: lead_id, customer_id, approved=true|false
 */
export async function GET(request) {
  try {
    const auth = await requireSalesOrAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const { profile, isAdmin, adminClient } = auth;
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id') || '';
    const customerId = searchParams.get('customer_id') || '';
    const approvedOnly = searchParams.get('approved') !== 'false';

    let query = adminClient
      .from('site_surveys')
      .select(`
        id, survey_code, lead_id, customer_id, roof_area_sqm, roof_direction,
        feasibility_status, survey_date, site_observations, created_by, created_at,
        approvals:survey_approvals ( id, status, reviewed_at, comments ),
        reports:survey_reports ( id, recommended_capacity_kw, estimated_cost, submitted_at )
      `)
      .order('created_at', { ascending: false });

    if (leadId) query = query.eq('lead_id', leadId);
    if (customerId) query = query.eq('customer_id', customerId);

    if (!isAdmin) {
      const { data: leads } = await adminClient
        .from('leads')
        .select('id')
        .or(`assigned_to.eq.${profile.id},created_by.eq.${profile.id}`)
        .limit(500);
      const leadIds = (leads || []).map((row) => row.id);
      if (leadIds.length === 0) return jsonResponse({ surveys: [] });
      query = query.in('lead_id', leadIds);
    }

    const { data, error } = await query;
    if (error) return jsonError('Failed to load surveys: ' + error.message, 500);

    const surveys = (data || [])
      .map((survey) => {
        const approved =
          survey.feasibility_status === 'approved' ||
          (survey.approvals || []).some((row) => row.status === 'approved');
        const report = (survey.reports || [])
          .slice()
          .sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0))[0] || null;
        return { ...survey, approved, latest_report: report };
      })
      .filter((survey) => (approvedOnly ? survey.approved : true));

    return jsonResponse({ surveys });
  } catch (error) {
    return jsonError(error.message || 'Failed to load surveys.', error.status || 500);
  }
}
