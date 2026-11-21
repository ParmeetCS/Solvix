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


