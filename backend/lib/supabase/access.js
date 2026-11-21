// Central identity and access resolution for every SOLVIX API.
//
// Every module guard (sales, survey, installation, warehouse, support,
// finance, subsidy) builds on this file so that role and department checks are
// identical everywhere. There is no development bypass: a request without a
// valid Supabase access token is always rejected with 401.
import { getUserFromRequest } from './auth.js';
import { createAdminClient } from './client.js';

export const PROFILE_SELECT = `
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
`;

/**
 * Portals a user can sign in through. `departments` are matched against the
 * lower-cased department codes/names of the user (substring match).
 */
export const PORTALS = {
  admin: { accountTypes: ['admin'], departments: [] },
  customer: { accountTypes: ['customer'], departments: [] },
  sales: { accountTypes: ['employee'], departments: ['sales', 'crm'] },
  technician: { accountTypes: ['employee'], departments: ['install', 'technic', 'survey', 'operat'] },
  staff: {
    accountTypes: ['employee'],
    departments: ['warehouse', 'inventory', 'logistics', 'support', 'service', 'warranty', 'finance', 'account', 'billing', 'subsidy', 'documentation'],
  },
};

/** Lower-cased department codes and names of the user's approved departments. */
export async function collectDepartmentText(adminClient, profile) {
  const parts = [];
  if (profile?.departments) {
    parts.push(profile.departments.code, profile.departments.name);
  }
  try {
    const { data } = await adminClient
      .from('employee_departments')
      .select('departments:department_id ( code, name )')
      .eq('employee_id', profile.id)
      .eq('is_approved', true);
    for (const row of data || []) {
      parts.push(row.departments?.code, row.departments?.name);
    }
  } catch {
    // employee_departments unavailable: fall back to the profile department.
  }
  return parts.filter(Boolean).map((p) => String(p).toLowerCase()).join(' | ');
}

export function departmentMatches(deptText, keywords) {
  return keywords.some((k) => deptText.includes(k));
}

/** Which portal does this profile belong to? Returns a key of PORTALS or null. */
export function portalForProfile(profile, deptText) {
  const roleCode = String(profile?.roles?.code || '').toLowerCase();
  if (profile?.account_type === 'admin' || roleCode === 'admin') return 'admin';
  if (profile?.account_type === 'customer') return 'customer';
  if (profile?.account_type !== 'employee') return null;
  if (departmentMatches(deptText, PORTALS.sales.departments)) return 'sales';
  if (departmentMatches(deptText, PORTALS.technician.departments)) return 'technician';
  if (departmentMatches(deptText, PORTALS.staff.departments)) return 'staff';
  return null; // employee not yet approved into a department
}

const ACTOR_TTL_MS = 30 * 1000;
const actorCache = new Map(); // auth user id -> { value, until }

/** Call after changing a user's role, department or status so the change applies at once. */
export function invalidateActor(authUserId) {
  if (authUserId) actorCache.delete(authUserId); else actorCache.clear();
}

/**
 * Resolve the authenticated actor for a request.
 * Returns { actor } on success or { error, status } on failure.
 */
export async function resolveActor(request) {
  let authResult;
  try {
    authResult = await getUserFromRequest(request);
  } catch (err) {
    authResult = { user: null, error: err };
  }
  const { user, error: userError } = authResult;
  if (userError || !user) {
    return { error: 'Authentication required. Missing or invalid Bearer token.', status: 401 };
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch {
    return { error: 'Server is not configured: Supabase credentials are missing.', status: 500 };
  }

  const cached = actorCache.get(user.id);
  if (cached && cached.until > Date.now()) {
    return { actor: { ...cached.value, user, adminClient } };
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: 'User profile not found.', status: 404 };
  }
  if (!profile.is_active) {
    return { error: 'Account suspended or inactive.', status: 403 };
  }

  const roleCode = String(profile.roles?.code || '').toLowerCase();
  const isAdmin = roleCode === 'admin' || profile.account_type === 'admin';
  const deptText = await collectDepartmentText(adminClient, profile);
  const portal = portalForProfile(profile, deptText);

  return { actor: buildActor({ user, profile, adminClient, roleCode, isAdmin, deptText, portal }, true) };
}

function buildActor(base, store) {
  const actor = {
    ...base,
    isCustomer: base.profile.account_type === 'customer',
    isEmployee: base.profile.account_type === 'employee',
    inDepartment: (keywords) => base.isAdmin || departmentMatches(base.deptText, keywords),
  };
  if (store) {
    actorCache.set(base.user.id, { value: { profile: base.profile, roleCode: base.roleCode, isAdmin: base.isAdmin, deptText: base.deptText, portal: base.portal, isCustomer: actor.isCustomer, isEmployee: actor.isEmployee, inDepartment: actor.inDepartment }, until: Date.now() + ACTOR_TTL_MS });
    if (actorCache.size > 500) actorCache.delete(actorCache.keys().next().value);
  }
  return actor;
}

/** Admin-only guard shared by every /api/v1/admin endpoint. */
export async function requireAdminActor(request) {
  const { actor, error, status } = await resolveActor(request);
  if (error) return { error, status };
  if (!actor.isAdmin) return { error: 'Administrator access required.', status: 403 };
  return { actor };
}

/** Same as resolveActor but allows only the listed department keywords (or admin). */
export async function requireDepartment(request, keywords, label) {
  const { actor, error, status } = await resolveActor(request);
  if (error) return { error, status };
  if (!actor.inDepartment(keywords) || (!actor.isAdmin && !actor.isEmployee)) {
    return { error: `Access denied. ${label} department or Administrator access required.`, status: 403 };
  }
  return { actor };
}
