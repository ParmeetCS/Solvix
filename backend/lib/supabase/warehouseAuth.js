// Authentication and RBAC verification helpers for Warehouse & Inventory endpoints
import { getUserFromRequest } from './auth';
import { createAdminClient } from './client';
import { collectDepartmentText } from './access.js';

/**
 * Validates whether the requesting user is authenticated and has permission to
 * access Warehouse & Inventory resources.
 * 
 * Roles:
 * - Admin: Full clearance (products, adjustments, dispatches, warranties)
 * - Warehouse Manager: Full operational clearance (adjustments, PO receiving, dispatches)
 * - Warehouse Staff / Inventory Specialist: Standard operations (stock-in, packing, serial scanning)
 * - Sales / Ops: Read-only visibility to stock availability
 */
export async function requireWarehouseAccess(request, { requireManage = false, requireAdjustment = false } = {}) {
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
    // Supabase keys might not be configured in local dev
  }

  // Dev fallback: allow dev testing with mock manager profile if no DB connection
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
  const deptText = await collectDepartmentText(adminClient, profile);
  const deptCode = deptText;
  const deptName = deptText;

  const isAdmin = roleCode === 'admin' || profile.account_type === 'admin';
  const isWarehouseManager = isAdmin || 
    ((deptCode.includes('warehouse') || deptCode.includes('inventory') || deptCode.includes('logistics') || deptName.includes('warehouse')) &&
     (roleCode.includes('manager') || roleCode.includes('lead') || roleCode.includes('head')));
  const isWarehouseStaff = isAdmin || isWarehouseManager ||
    deptCode.includes('warehouse') || deptCode.includes('inventory') || deptCode.includes('logistics') || deptName.includes('warehouse') ||
    roleCode.includes('warehouse') || roleCode.includes('inventory') || roleCode.includes('dispatch');

  // Sales and installation staff get read-only visibility of stock.
  const hasReadAccess = isAdmin || isWarehouseStaff || deptText.includes('sales') || deptText.includes('install');
  if (profile.account_type === 'customer' || !hasReadAccess) {
    return { error: 'Access denied. Warehouse team or Administrator access required.', status: 403 };
  }

  if (requireAdjustment && !isAdmin && !isWarehouseManager) {
    return { error: 'Access denied. Only Warehouse Managers or Administrators can perform manual stock adjustments.', status: 403 };
  }

  if (requireManage && !isAdmin && !isWarehouseManager) {
    return { error: 'Access denied. Warehouse Management privileges required.', status: 403 };
  }

  return {
    user,
    profile,
    isAdmin,
    isWarehouseManager,
    isWarehouseStaff,
    canAdjustStock: isAdmin || isWarehouseManager,
    canManageCatalogue: isAdmin || isWarehouseManager,
    adminClient,
    error: null
  };
}

/**
 * Log warehouse activity into activity_logs
 */
export async function logWarehouseActivity({ actorId, action, entityId = null, entityType = 'inventory', metadata = {} }) {
  try {
    const admin = createAdminClient();
    await admin.from('activity_logs').insert({
      actor_id: actorId || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
  } catch (err) {
    console.error('Failed to write warehouse activity log:', err.message);
  }
}
