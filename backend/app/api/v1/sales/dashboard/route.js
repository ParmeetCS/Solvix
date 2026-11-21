import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/sales/dashboard
 * Aggregates live sales metrics and pipeline overview directly from database.
 */
export async function GET(request) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isAdmin, adminClient } = authResult;

    // Scope query: Sales employees view their own assigned leads, Admins view all
    let leadsQuery = adminClient.from('leads').select('*');
    if (!isAdmin) {
      leadsQuery = leadsQuery.eq('assigned_to', profile.id);
    }

    const { data: leads, error: leadsError } = await leadsQuery;
    if (leadsError) {
      return jsonError('Failed to fetch leads: ' + leadsError.message, 500);
    }

    const allLeads = leads || [];

    // Compute status metrics
    const totalLeads = allLeads.length;
    let newLeads = 0;
    let contactedLeads = 0;
    let qualifiedLeads = 0;
    let quotationPending = 0;
    let convertedLeads = 0;
    let lostLeads = 0;
    const sourceCounts = {};
    const pipelineMap = {
      new: 0,
      contacted: 0,
      follow_up_required: 0,
      qualified: 0,
      survey_requested: 0,
      quotation_sent: 0,
      converted: 0,
      lost: 0
    };

    allLeads.forEach(lead => {
      const st = lead.status;
      if (st === 'new') newLeads++;
      else if (st === 'contacted') contactedLeads++;
      else if (st === 'qualified') qualifiedLeads++;
      else if (st === 'quotation_sent' || st === 'survey_requested' || st === 'proposal_sent' || st === 'negotiation') quotationPending++;
      else if (st === 'converted') convertedLeads++;
      else if (st === 'lost' || st === 'disqualified') lostLeads++;

      if (pipelineMap[st] !== undefined) {
        pipelineMap[st]++;
      } else {
        pipelineMap[st] = 1;
      }

      const src = lead.source || 'other';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });

    // Fetch follow-ups due today & overdue
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let followUpsQuery = adminClient
      .from('follow_ups')
      .select(`
        id,
        scheduled_at,
        completed_at,
        status,
        follow_up_type,
        notes,
        outcome,
        lead_id,
        leads:lead_id ( id, lead_code, customer_name, phone, status, assigned_to )
      `)
      .order('scheduled_at', { ascending: true });

    const { data: allFollowUps, error: fuError } = await followUpsQuery;
    const followUpsList = allFollowUps || [];

    // Filter follow-ups by lead assignment if non-admin
    const scopedFollowUps = isAdmin
      ? followUpsList
      : followUpsList.filter(f => f.leads?.assigned_to === profile.id);

    let dueTodayCount = 0;
    let overdueCount = 0;
    const now = new Date();

    const upcomingFollowUps = [];

    scopedFollowUps.forEach(f => {
      if (f.status === 'pending') {
        const sched = new Date(f.scheduled_at);
        if (sched >= todayStart && sched <= todayEnd) {
          dueTodayCount++;
        } else if (sched < now) {
          overdueCount++;
        }
        if (sched >= now && upcomingFollowUps.length < 8) {
          upcomingFollowUps.push(f);
        }
      }
    });

    // Fetch recent leads (latest 6)
    let recentLeadsQuery = adminClient
      .from('leads')
      .select('id, lead_code, customer_name, phone, email, source, status, priority, estimated_value, created_at, assigned_to')
      .order('created_at', { ascending: false })
      .limit(6);

    if (!isAdmin) {
      recentLeadsQuery = recentLeadsQuery.eq('assigned_to', profile.id);
    }
    const { data: recentLeads } = await recentLeadsQuery;

    // Fetch recent customer interactions (latest 6)
    let interactionsQuery = adminClient
      .from('customer_interactions')
      .select(`
        id,
        interaction_type,
        subject,
        summary,
        occurred_at,
        lead_id,
        customer_id,
        created_by,
        profiles:created_by ( id, full_name, email )
      `)
      .order('occurred_at', { ascending: false })
      .limit(6);

    const { data: recentInteractions } = await interactionsQuery;

    // Sales employee performance (lead conversion stats)
    let employeePerformance = [];
    if (isAdmin) {
      const { data: employees } = await adminClient
        .from('profiles')
        .select('id, full_name, email')
        .eq('account_type', 'employee')
        .eq('is_active', true);

      if (employees && employees.length > 0) {
        employeePerformance = employees.map(emp => {
          const empLeads = allLeads.filter(l => l.assigned_to === emp.id);
          const converted = empLeads.filter(l => l.status === 'converted').length;
          return {
            employeeId: emp.id,
            name: emp.full_name || emp.email,
            totalAssigned: empLeads.length,
            convertedCount: converted,
            conversionRate: empLeads.length > 0 ? ((converted / empLeads.length) * 100).toFixed(1) : 0
          };
        }).filter(e => e.totalAssigned > 0);
      }
    }

    return jsonResponse({
      summary: {
        totalLeads,
        newLeads,
        contactedLeads,
        followUpsDueToday: dueTodayCount,
        overdueFollowUps: overdueCount,
        qualifiedLeads,
        quotationPending,
        convertedLeads,
        lostLeads,
      },
      pipeline: pipelineMap,
      leadSourceDistribution: sourceCounts,
      recentLeads: recentLeads || [],
      upcomingFollowUps,
      recentInteractions: recentInteractions || [],
      employeePerformance,
      scope: isAdmin ? 'all' : 'assigned'
    });
  } catch (error) {
    return jsonError('Server error while aggregating sales dashboard: ' + error.message, 500);
  }
}
