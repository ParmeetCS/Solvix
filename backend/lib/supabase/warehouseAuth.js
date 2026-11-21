// Authentication and RBAC verification helpers for Warehouse & Inventory endpoints
import { getUserFromRequest } from './auth';
import { createAdminClient } from './client';

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
    if (process.env.NODE_ENV === 'production') {
      return { error: 'Authentication required. Missing or invalid Bearer token.', status: 401 };
    }

    const mockProfile = {
      id: '00000000-0000-0000-0000-000000000001',
      auth_user_id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Lead Warehouse Manager (Dev)',
      email: 'warehouse.manager@solvix.energy',
      account_type: 'admin',
      is_active: true,
      roles: { code: 'admin', name: 'Administrator' },
      departments: { code: 'WAREHOUSE', name: 'Warehouse & Logistics' }
    };

    return {
      user: { id: mockProfile.auth_user_id, email: mockProfile.email },
      profile: mockProfile,
      isAdmin: true,
      isWarehouseManager: true,
      isWarehouseStaff: true,
      canAdjustStock: true,
      canManageCatalogue: true,
      adminClient,
      error: null
    };
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
  const isWarehouseManager = isAdmin || 
    ((deptCode.includes('warehouse') || deptCode.includes('inventory') || deptCode.includes('logistics') || deptName.includes('warehouse')) &&
     (roleCode.includes('manager') || roleCode.includes('lead') || roleCode.includes('head')));
  const isWarehouseStaff = isAdmin || isWarehouseManager ||
    deptCode.includes('warehouse') || deptCode.includes('inventory') || deptCode.includes('logistics') || deptName.includes('warehouse') ||
    roleCode.includes('warehouse') || roleCode.includes('inventory') || roleCode.includes('dispatch');

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
