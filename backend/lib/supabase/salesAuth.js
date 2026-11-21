// Authentication and RBAC verification helpers for CRM & Sales endpoints
import { requireDepartment } from './access.js';
import { createAdminClient } from './client.js';

/**
 * Validates whether the requesting user is authenticated and has permission to
 * access Sales/CRM resources (either an Admin, or an Employee assigned to Sales/CRM).
 * 
 * Returns { user, profile, isAdmin, isSales, error, status }
 */
export async function requireSalesOrAdmin(request) {
  const { actor, error, status } = await requireDepartment(request, ['sales', 'crm'], 'Sales');
  if (error) return { error, status };
  return {
    user: actor.user,
    profile: actor.profile,
    isAdmin: actor.isAdmin,
    isSales: true,
    adminClient: actor.adminClient,
    error: null,
  };
}


/**
 * Log an action into the activity_logs table
 */
export async function logActivity({ actorId, action, entityType, entityId, metadata, departmentId }) {
  try {
    const admin = createAdminClient();
    await admin.from('activity_logs').insert({
      actor_id: actorId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata: metadata || {},
      department_id: departmentId || null,
    });
  } catch (err) {
    console.error('Failed to write activity log:', err.message);
  }
}
