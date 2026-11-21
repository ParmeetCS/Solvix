import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireInstallationAccess } from '@/lib/supabase/installationAuth';
import { installationStore } from '@/lib/installation/installationStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/installation/my-jobs
 * Dedicated mobile-friendly endpoint for technicians to view only jobs they are authorized to handle.
 * Returns:
 * - Assigned jobs
 * - Today's installations
 * - Upcoming installations
 * - Pending tasks
 * - Completed jobs
 */
export async function GET(request) {
  try {
    const authResult = await requireInstallationAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isAdmin, technicianRecord } = authResult;
    const todayStr = new Date().toISOString().split('T')[0];

    // Get all jobs assigned to this technician
    const allResult = await installationStore.getJobs({}, profile, false, true);
    const myJobs = allResult.jobs || [];

    const todayInstallations = myJobs.filter(j => 
      ['scheduled', 'in_progress', 'assigned'].includes(j.status) &&
      (j.planned_installation_date === todayStr || (j.scheduled_start && j.scheduled_start.startsWith(todayStr)))
    );

    const upcomingInstallations = myJobs.filter(j =>
      ['scheduled', 'assigned'].includes(j.status) &&
      j.planned_installation_date && j.planned_installation_date > todayStr
    );

    const inProgressJobs = myJobs.filter(j => j.status === 'in_progress');
    const completedJobs = myJobs.filter(j => j.status === 'completed');

    // Aggregate pending tasks across active jobs
    const pendingTasks = [];
    for (const j of myJobs.filter(j => !['completed', 'cancelled'].includes(j.status))) {
      for (const t of j.tasks || []) {
        if (!t.is_completed && t.is_required) {
          pendingTasks.push({
            task_id: t.id,
            task_name: t.task_name,
            job_id: j.id,
            installation_code: j.installation_code,
            customer_name: j.customer_name,
            site_address: j.site_address
          });
        }
      }
    }

    return jsonResponse({
      technician: technicianRecord || {
        id: profile.id,
        full_name: profile.full_name,
        employee_code: profile.employee_id || 'TECH-DEV'
      },
      counts: {
        totalAssigned: myJobs.length,
        todayCount: todayInstallations.length,
        inProgressCount: inProgressJobs.length,
        upcomingCount: upcomingInstallations.length,
        pendingTasksCount: pendingTasks.length,
        completedCount: completedJobs.length
      },
      todayInstallations,
      inProgressJobs,
      upcomingInstallations,
      pendingTasks: pendingTasks.slice(0, 15),
      completedJobs: completedJobs.slice(0, 10),
      allJobs: myJobs
    });
  } catch (error) {
    return jsonError('Error fetching technician dashboard jobs: ' + error.message, 500);
  }
}
