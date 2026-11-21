import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/installation/dashboard
 * Aggregates installation project KPIs, status distributions, upcoming visits, technician workloads, and recent activities.
 */
export async function GET(request) {
  try {
    const authResult = await requireInstallationAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;

    // Live Supabase query if connected
    if (adminClient) {
      try {
        const { data: dbJobs, error: jobErr } = await adminClient
          .from('installations')
          .select('*');

        if (!jobErr && dbJobs && dbJobs.length > 0) {
          // Process live DB jobs
          const todayStr = new Date().toISOString().split('T')[0];
          const totalProjects = dbJobs.length;
          const pending = dbJobs.filter(j => j.status === 'pending').length;
          const assigned = dbJobs.filter(j => j.status === 'assigned').length;
          const scheduled = dbJobs.filter(j => j.status === 'scheduled').length;
          const inProgress = dbJobs.filter(j => j.status === 'in_progress').length;
          const completed = dbJobs.filter(j => j.status === 'completed').length;
          const onHold = dbJobs.filter(j => j.status === 'on_hold').length;
          const inspectionRequired = dbJobs.filter(j => j.status === 'inspection_required').length;
          const cancelled = dbJobs.filter(j => j.status === 'cancelled').length;

          const delayed = dbJobs.filter(j => {
            if (['completed', 'cancelled'].includes(j.status)) return false;
            if (j.status === 'on_hold') return true;
            if (j.expected_completion_date && j.expected_completion_date < todayStr) return true;
            return false;
          }).length;

          const upcoming = dbJobs.filter(j => 
            ['scheduled', 'assigned'].includes(j.status) &&
            j.planned_installation_date && j.planned_installation_date >= todayStr
          ).length;

          const statusDistribution = [
            { name: 'Pending', count: pending, color: '#f59e0b' },
            { name: 'Assigned', count: assigned, color: '#3b82f6' },
            { name: 'Scheduled', count: scheduled, color: '#06b6d4' },
            { name: 'In Progress', count: inProgress, color: '#8b5cf6' },
            { name: 'On Hold', count: onHold, color: '#f97316' },
            { name: 'Inspection Required', count: inspectionRequired, color: '#eab308' },
            { name: 'Completed', count: completed, color: '#10b981' },
            { name: 'Cancelled', count: cancelled, color: '#ef4444' }
          ];

          const { data: dbTechs } = await adminClient
            .from('technicians')
            .select(`
              *,
              profile:profile_id ( id, full_name, email, phone )
            `);

          const technicianWorkload = (dbTechs || []).map(t => ({
            id: t.id,
            employee_code: t.employee_code,
            full_name: t.profile?.full_name || t.full_name || 'Technician',
            email: t.profile?.email || t.email,
            phone: t.profile?.phone || t.phone,
            is_available: t.is_available,
            max_daily_jobs: t.max_daily_jobs || 1,
            skills: t.skills || [],
            certifications: t.certifications || []
          }));

          return jsonResponse({
            kpis: {
              totalProjects,
              pending,
              assigned,
              scheduled,
              inProgress,
              completed,
              delayed,
              upcoming,
              onHold,
              inspectionRequired
            },
            statusDistribution,
            technicianWorkload,
            recentActivity: [],
            upcomingInstallations: dbJobs.filter(j => ['scheduled', 'assigned'].includes(j.status)).slice(0, 5)
          });
        }
      } catch (e) {
        // Fall back to memory store
      }
    }

    const data = await installationStore.getDashboardMetrics();
    return jsonResponse(data);
  } catch (error) {
    return jsonError('Failed to fetch installation dashboard: ' + error.message, 500);
  }
}
