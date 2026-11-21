// Authentication, RBAC and Notification helpers for Customer Support & Warranty Module
import { getUserFromRequest } from './auth.js';
import { createAdminClient } from './client.js';

/**
 * Validates whether the user is authenticated and authorized for Support operations:
 * either an Admin or an Employee assigned to Support / Customer Service.
 */
export async function requireSupportOrAdmin(request) {
  const { user, error: userError } = await getUserFromRequest(request);
  if (userError || !user) {
    return { error: 'Authentication required. Missing or invalid Bearer token.', status: 401 };
  }

  const adminClient = createAdminClient();

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

  const roleCode = String(profile.roles?.code || '').toLowerCase();
  const isAdmin = roleCode === 'admin' || profile.account_type === 'admin';

  let isSupport = false;
  const deptCode = String(profile.departments?.code || '').toLowerCase();
  const deptName = String(profile.departments?.name || '').toLowerCase();

  if (
    deptCode.includes('support') || deptName.includes('support') ||
    deptCode.includes('service') || deptName.includes('service') ||
    deptCode.includes('warranty') || deptName.includes('warranty')
  ) {
    isSupport = true;
  }

  // Check employee_departments table as well
  try {
    const { data: depts } = await adminClient
      .from('employee_departments')
      .select('department_id, departments:department_id ( code, name )')
      .eq('employee_id', profile.id)
      .eq('is_approved', true);

    if (depts && depts.length > 0) {
      for (const d of depts) {
        const c = String(d.departments?.code || '').toLowerCase();
        const n = String(d.departments?.name || '').toLowerCase();
        if (c.includes('support') || n.includes('support') || c.includes('service') || n.includes('service')) {
          isSupport = true;
          break;
        }
      }
    }
  } catch (e) {
    // Non-blocking
  }

  // Allow support, admin, or employee in development
  if (!isAdmin && !isSupport) {
    if (profile.account_type !== 'employee' && profile.account_type !== 'admin') {
      return { error: 'Access denied. Support department or Administrator access required.', status: 403 };
    }
  }

  return {
    user,
    profile,
    isAdmin,
    isSupport: isSupport || isAdmin || profile.account_type === 'employee',
    adminClient,
    error: null
  };
}

/**
 * Validates request for Customer OR Support/Admin:
 * Customers can create and view only their own tickets.
 */
export async function requireCustomerOrSupportOrAdmin(request) {
  const { user, error: userError } = await getUserFromRequest(request);
  if (userError || !user) {
    return { error: 'Authentication required. Missing or invalid Bearer token.', status: 401 };
  }

  const adminClient = createAdminClient();

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
      department_id
    `)
    .eq('auth_user_id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'User profile not found.', status: 404 };
  }

  if (!profile.is_active) {
    return { error: 'Account suspended or inactive.', status: 403 };
  }

  const isCustomer = profile.account_type === 'customer';
  const isAdmin = profile.account_type === 'admin' || profile.roles?.code === 'admin';
  const isEmployee = profile.account_type === 'employee';

  let customerRecord = null;
  if (isCustomer) {
    const { data: cust } = await adminClient
      .from('customers')
      .select('id, customer_code, contact_name, email, phone')
      .eq('profile_id', profile.id)
      .maybeSingle();
    customerRecord = cust;
  }

  return {
    user,
    profile,
    customerRecord,
    isCustomer,
    isEmployee,
    isAdmin,
    adminClient,
    error: null
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
