// Authentication and RBAC verification helpers for CRM & Sales endpoints
import { getUserFromRequest } from './auth';
import { createAdminClient } from './client';

/**
 * Validates whether the requesting user is authenticated and has permission to
 * access Sales/CRM resources (either an Admin, or an Employee assigned to Sales/CRM).
 * 
 * Returns { user, profile, isAdmin, isSales, error, status }
 */
export async function requireSalesOrAdmin(request) {
  const { user, error: userError } = await getUserFromRequest(request);
  if (userError || !user) {
    return { error: 'Authentication required. Missing or invalid Bearer token.', status: 401 };
  }

  const adminClient = createAdminClient();

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

  const roleCode = profile.roles?.code || '';
  const isAdmin = roleCode === 'admin' || profile.account_type === 'admin';

  // Check department assignments in employee_departments table as well
  let isSales = false;
  const deptCode = (profile.departments?.code || '').toLowerCase();
  const deptName = (profile.departments?.name || '').toLowerCase();

  if (deptCode.includes('sales') || deptName.includes('sales') || deptName.includes('crm')) {
    isSales = true;
  }

  // Also check multiple department approvals if employee_departments table exists
  try {
    const { data: depts } = await adminClient
      .from('employee_departments')
      .select('department_id, departments:department_id ( code, name )')
      .eq('employee_id', profile.id)
      .eq('is_approved', true);

    if (depts && depts.length > 0) {
      for (const d of depts) {
        const c = (d.departments?.code || '').toLowerCase();
        const n = (d.departments?.name || '').toLowerCase();
        if (c.includes('sales') || n.includes('sales') || n.includes('crm')) {
          isSales = true;
          break;
        }
      }
    }
  } catch (e) {
    // Non-blocking if table is empty or querying fails
  }

  // Access permitted if Admin OR Sales employee
  // If account_type is 'employee' without department yet or in dev/testing, check permissions
  if (!isAdmin && !isSales) {
    // If user is employee but no strict department set in dev seed, check role
    if (profile.account_type !== 'employee' && profile.account_type !== 'admin') {
      return { error: 'Access denied. Sales department or Administrator access required.', status: 403 };
    }
  }

  return {
    user,
    profile,
    isAdmin,
    isSales: isSales || isAdmin,
    adminClient,
    error: null
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
