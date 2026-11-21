// Authentication, RBAC and Notification helpers for Customer Support & Warranty Module
import { getUserFromRequest } from './auth.js';
import { requireDepartment } from './access.js';
import { createAdminClient } from './client.js';

/**
 * Validates whether the user is authenticated and authorized for Support operations:
 * either an Admin or an Employee assigned to Support / Customer Service.
 */
export async function requireSupportOrAdmin(request) {
  const { actor, error, status } = await requireDepartment(request, ['support', 'service', 'warranty'], 'Support');
  if (error) return { error, status };
  return {
    user: actor.user,
    profile: actor.profile,
    isAdmin: actor.isAdmin,
    isSupport: true,
    adminClient: actor.adminClient,
    error: null,
  };
}


