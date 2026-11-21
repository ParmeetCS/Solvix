import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

function effectiveStatus(quotation) {
  const active = ['draft', 'pending_approval', 'under_review', 'approved', 'sent', 'viewed'];
  if (
    active.includes(quotation.status) &&
    quotation.validity_date &&
    new Date(quotation.validity_date + 'T23:59:59').getTime() < Date.now()
  ) {
    return 'expired';
  }
  return quotation.status === 'converted' ? 'converted_to_order' : quotation.status;
}

/**
 * GET /api/v1/sales/quotations/dashboard
 * Scoped quotation KPIs, status counts and conversion rate.
 */
export async function GET(request) {
  try {
    const auth = await requireSalesOrAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { profile, isAdmin, adminClient } = auth;

    let query = adminClient
      .from('quotations')
      .select('id, quotation_code, status, total_amount, validity_date, created_at, customer_id, customer:customer_id ( contact_name, company_name )')
      .order('created_at', { ascending: false });

    if (!isAdmin) query = query.eq('created_by', profile.id);

    const { data, error } = await query;
    if (error) return jsonError('Failed to load quotation dashboard: ' + error.message, 500);

    const rows = data || [];
    const counts = {
      total: rows.length,
      draft: 0,
      pending_approval: 0,
      approved: 0,
      sent: 0,
      viewed: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
      converted_to_order: 0,
    };

    let totalValue = 0;
    let acceptedValue = 0;
    let pendingApprovalValue = 0;

    for (const row of rows) {
      const status = effectiveStatus(row);
      if (counts[status] !== undefined) counts[status] += 1;
      totalValue += Number(row.total_amount) || 0;
      if (status === 'accepted' || status === 'converted_to_order') {
        acceptedValue += Number(row.total_amount) || 0;
      }
      if (status === 'pending_approval') {
        pendingApprovalValue += Number(row.total_amount) || 0;
      }
    }

    const customerReached =
      counts.sent + counts.viewed + counts.accepted + counts.rejected + counts.converted_to_order;
    const acceptanceRate = customerReached > 0
      ? ((counts.accepted + counts.converted_to_order) / customerReached) * 100
      : 0;
    const conversionRate = counts.total > 0
      ? (counts.converted_to_order / counts.total) * 100
      : 0;

    return jsonResponse({
      summary: {
        ...counts,
        total_value: Math.round(totalValue * 100) / 100,
        accepted_value: Math.round(acceptedValue * 100) / 100,
        pending_approval_value: Math.round(pendingApprovalValue * 100) / 100,
        acceptance_rate: Math.round(acceptanceRate * 10) / 10,
        conversion_rate: Math.round(conversionRate * 10) / 10,
      },
      recentQuotations: rows.slice(0, 6),
    });
  } catch (error) {
    return jsonError(error.message || 'Failed to load quotation dashboard.', error.status || 500);
  }
}
