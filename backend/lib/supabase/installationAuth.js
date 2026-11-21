// Authentication and RBAC verification helpers for Installation & Technical Operations endpoints
import { getUserFromRequest } from './auth.js';
import { createAdminClient } from './client.js';
import { collectDepartmentText } from './access.js';

/**
 * Validates whether the requesting user is authenticated and has permission to
 * access Installation resources.
 * 
 * Roles supported:
 * - Admin: Full access (create jobs, assign, schedule, verify, complete, manage technicians)
 * - Operations / Installation Manager: Full management access
 * - Technician / Lead Technician: Access to assigned jobs, equipment verification, checklist, photos, commissioning, signature
 * - Customer / Sales: Read-only access to their specific installation status and reports
 * 
 * Returns { user, profile, isAdmin, isManager, isTechnician, technicianRecord, canManage, adminClient, error, status }
 */
export async function requireInstallationAccess(request, { requireManager = false, targetJobId = null } = {}) {
  let authResult;
  try {
    authResult = await getUserFromRequest(request);
  } catch (err) {
    authResult = { user: null, error: err };
  }

  const { user, error: userError } = authResult;

  let adminClient = null;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    // If Supabase keys aren't set in dev, adminClient will be null
  }

  // If no user token in request, check if we're in dev mode
  if (userError || !user) {
    return { error: 'Authentication required. Missing or invalid Bearer token.', status: 401 };
  }

  if (!adminClient) {
    return { error: 'Database client initialization failed.', status: 500 };
  }

  // Fetch user profile with role and department
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select(`
      id,
      auth_user_id,
      full_name,
      email,
      phone,
      account_type,
      is_active,
      role_id,
      roles:role_id ( id, name, code ),
      department_id,
      departments:department_id ( id, name, code )
    `)
    .eq('auth_user_id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'User profile not found.', status: 404 };
  }

  if (!profile.is_active) {
    return { error: 'Account suspended or inactive.', status: 403 };
  }

  const roleCode = (profile.roles?.code || '').toLowerCase();
  const deptCode = (profile.departments?.code || '').toLowerCase();
  const deptName = (profile.departments?.name || '').toLowerCase();

  const isAdmin = roleCode === 'admin' || profile.account_type === 'admin';
  const isManager = isAdmin || 
    ((deptCode.includes('install') || deptCode.includes('operat') || deptName.includes('install') || deptName.includes('operat')) &&
     (roleCode.includes('manager') || roleCode.includes('head') || roleCode.includes('lead')));

  // Check if user is registered in the technicians table
  let technicianRecord = null;
  try {
    const { data: tech } = await adminClient
      .from('technicians')
      .select('*')
      .eq('profile_id', profile.id)
      .maybeSingle();
    technicianRecord = tech || null;
  } catch (e) {
    // Non-blocking
  }

  const isTechnician = isAdmin || isManager || Boolean(technicianRecord) || 
    roleCode.includes('technician') || deptCode.includes('install') || deptName.includes('install');

  const canManage = isAdmin || isManager;

  if (requireManager && !canManage) {
    return { error: 'Access denied. Installation Manager or Administrator privileges required.', status: 403 };
  }

  // If a technician is attempting to access a specific job, verify they are assigned (unless manager/admin)
  if (targetJobId && !canManage && isTechnician) {
    const techId = technicianRecord ? technicianRecord.id : null;
    if (techId) {
      try {
        const { data: assignments } = await adminClient
          .from('technician_assignments')
          .select('id')
          .eq('installation_id', targetJobId)
          .eq('technician_id', techId)
          .is('unassigned_at', null)
          .limit(1);

        if (!assignments || assignments.length === 0) {
          // Also check by profile_id in installations.created_by
          const { data: job } = await adminClient
            .from('installations')
            .select('created_by')
            .eq('id', targetJobId)
            .maybeSingle();

          if (!job || job.created_by !== profile.id) {
            return { error: 'Access denied. You are not assigned to this installation job.', status: 403 };
          }
        }
      } catch (e) {
        // Fall through
      }
    }
  }

  return {
    user,
    profile,
    isAdmin,
    isManager,
    isTechnician,
    technicianRecord,
    canManage,
    adminClient,
    error: null
  };
}

/**
 * Log an action into the activity_logs table for audit trail
 */
export async function logInstallationActivity({ actorId, action, installationId, metadata = {}, departmentId = null }) {
  try {
    const admin = createAdminClient();
    await admin.from('activity_logs').insert({
      actor_id: actorId || null,
      action,
      entity_type: 'installation',
      entity_id: installationId || null,
      metadata,
      department_id: departmentId || null,
    });
  } catch (err) {
    console.error('Failed to write installation activity log:', err.message);
  }
}

/**
 * Send notification to an employee or technician
 */
export async function createInstallationNotification({ recipientId, title, message, installationId = null, type = 'installation' }) {
  try {
    const admin = createAdminClient();
    await admin.from('notifications').insert({
      user_id: recipientId,
      title,
      message,
      notification_type: type,
      reference_id: installationId,
      is_read: false
    });
  } catch (err) {
    // Non-blocking
  }
}

export default {
  requireInstallationAccess,
  logInstallationActivity,
  createInstallationNotification
};
