// Authentication, RBAC and Notification helpers for Customer Support & Warranty Module
import { getUserFromRequest } from './auth.js';
import { requireDepartment, resolveActor } from './access.js';
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

/**
 * Validates request for Customer OR Support/Admin:
 * Customers can create and view only their own tickets.
 */
export async function requireCustomerOrSupportOrAdmin(request) {
  const { actor, error, status } = await resolveActor(request);
  if (error) return { error, status };

  const staffAllowed = actor.isAdmin ||
    (actor.isEmployee && actor.inDepartment(['support', 'service', 'warranty']));
  if (!actor.isCustomer && !staffAllowed) {
    return { error: 'Access denied. Customer, Support or Administrator access required.', status: 403 };
  }

  let customerRecord = null;
  if (actor.isCustomer) {
    const { data: cust } = await actor.adminClient
      .from('customers')
      .select('id, customer_code, contact_name, email, phone')
      .eq('profile_id', actor.profile.id)
      .maybeSingle();
    customerRecord = cust;
  }

  return {
    user: actor.user,
    profile: actor.profile,
    customerRecord,
    isCustomer: actor.isCustomer,
    isEmployee: actor.isEmployee,
    isAdmin: actor.isAdmin,
    adminClient: actor.adminClient,
    error: null,
  };
}

/**
 * Log activity in activity_logs table
 */
export async function logSupportActivity({ actorId, action, entityType, entityId, metadata = {} }) {
  try {
    const adminClient = createAdminClient();
    await adminClient.from('activity_logs').insert({
      actor_id: actorId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata
    });
  } catch (err) {
    console.error('Failed to log support activity:', err.message);
  }
}

/**
 * Generate a notification in notifications table
 */
export async function sendNotification({ recipientId, title, body, type = 'info', link = null }) {
  if (!recipientId) return;
  try {
    const adminClient = createAdminClient();
    await adminClient.from('notifications').insert({
      recipient_id: recipientId,
      title,
      body,
      type,
      link,
      read: false
    });
  } catch (err) {
    console.error('Failed to send notification:', err.message);
  }
}
