import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSupportOrAdmin } from '@/lib/supabase/supportAuth';

export async function OPTIONS() {
  return handleOptions();
}

function parseTicketCategory(subject) {
  const match = (subject || '').match(/^\[(.*?)\]/);
  return match ? match[1] : 'Other';
}

/**
 * GET /api/v1/support/dashboard
 * Aggregates live figures from service_tickets, warranties, warranty_claims, and agents.
 */
export async function GET(request) {
  try {
    const authResult = await requireSupportOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;

    // 1. Fetch all tickets
    const { data: tickets, error: ticketsError } = await adminClient
      .from('service_tickets')
      .select(`
        id,
        ticket_code,
        subject,
        description,
        status,
        priority,
        created_at,
        resolved_at,
        closed_at,
        assigned_to,
        customer_id,
        customers:customer_id ( id, contact_name, email, phone ),
        profiles:assigned_to ( id, full_name, email )
      `)
      .order('created_at', { ascending: false });

    if (ticketsError) {
      return jsonError('Failed to fetch support tickets: ' + ticketsError.message, 500);
    }

    const allTickets = tickets || [];

    // Calculate metrics
    const totalTickets = allTickets.length;
    let openTickets = 0;
    let newTickets = 0;
    let assignedTickets = 0;
    let inProgressTickets = 0;
    let resolvedTickets = 0;
    let overdueTickets = 0;

    const now = new Date();
    const priorityDistribution = { low: 0, medium: 0, high: 0, critical: 0 };
    const statusDistribution = {
      new: 0,
      open: 0,
      assigned: 0,
      in_progress: 0,
      waiting_for_customer: 0,
      waiting_for_technician: 0,
      waiting_for_parts: 0,
      resolved: 0,
      closed: 0
    };
    const categoryDistribution = {};
    const agentWorkloadMap = {};

    allTickets.forEach((t) => {
      const st = t.status || 'open';
      statusDistribution[st] = (statusDistribution[st] || 0) + 1;

      if (st === 'new' || st === 'open') {
        if (st === 'new') newTickets++;
        openTickets++;
      }
      if (['assigned', 'in_progress', 'waiting_for_customer', 'waiting_for_technician', 'waiting_for_parts'].includes(st)) {
        openTickets++;
      }
      if (st === 'assigned') assignedTickets++;
      if (st === 'in_progress') inProgressTickets++;
      if (st === 'resolved' || st === 'closed') resolvedTickets++;

      // Overdue check: open for > 48 hours without resolution
      if (!['resolved', 'closed'].includes(st) && t.created_at) {
        const createdDate = new Date(t.created_at);
        const hoursOpen = (now - createdDate) / (1000 * 60 * 60);
        if (hoursOpen > 48) {
          overdueTickets++;
        }
      }

      // Priority
      const pr = t.priority === 'urgent' ? 'critical' : (t.priority || 'medium');
      if (priorityDistribution[pr] !== undefined) {
        priorityDistribution[pr]++;
      } else {
        priorityDistribution.medium++;
      }

      // Category
      const cat = parseTicketCategory(t.subject);
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;

      // Agent workload
      if (t.assigned_to && t.profiles) {
        const agentName = t.profiles.full_name || 'Agent';
        if (!agentWorkloadMap[t.assigned_to]) {
          agentWorkloadMap[t.assigned_to] = {
            id: t.assigned_to,
            name: agentName,
            email: t.profiles.email,
            assignedCount: 0,
            resolvedCount: 0
          };
        }
        if (!['resolved', 'closed'].includes(st)) {
          agentWorkloadMap[t.assigned_to].assignedCount++;
        } else {
          agentWorkloadMap[t.assigned_to].resolvedCount++;
        }
      }
    });

    // 2. Fetch warranty claims statistics
    const { data: claims } = await adminClient
      .from('warranty_claims')
      .select('id, status, claim_type, created_at');

    const totalClaims = (claims || []).length;
    let pendingClaims = 0;
    let approvedClaims = 0;
    let rejectedClaims = 0;

    (claims || []).forEach((c) => {
      if (c.status === 'submitted' || c.status === 'under_review') pendingClaims++;
      if (c.status === 'approved' || c.status === 'completed') approvedClaims++;
      if (c.status === 'rejected') rejectedClaims++;
    });

    // 3. Recent 8 tickets
    const recentTickets = allTickets.slice(0, 8).map((t) => ({
      ...t,
      ticket_number: t.ticket_code,
      issue_category: parseTicketCategory(t.subject)
    }));

    // 4. Agent workload array
    const agentWorkload = Object.values(agentWorkloadMap).sort((a, b) => b.assignedCount - a.assignedCount);

    return jsonResponse({
      summary: {
        totalTickets,
        openTickets,
        newTickets,
        assignedTickets,
        inProgressTickets,
        resolvedTickets,
        overdueTickets,
        warrantyClaims: totalClaims,
        pendingClaims,
        approvedClaims,
        rejectedClaims
      },
      priorityDistribution,
      statusDistribution,
      categoryDistribution,
      recentTickets,
      agentWorkload
    });
  } catch (error) {
    return jsonError('Server error generating support dashboard: ' + error.message, 500);
  }
}
