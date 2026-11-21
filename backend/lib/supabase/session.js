// Builds the session user returned by the auth endpoints and consumed by the
// frontend route guards. The backend is the single source of truth for which
// portal and modules an account may use.
import { PROFILE_SELECT, collectDepartmentText, portalForProfile } from './access.js';

// Module keys the frontend uses to decide which areas a user may open.
const MODULES_BY_DEPARTMENT = [
  { keys: ['sales', 'crm'], modules: ['sales', 'survey'] },
  { keys: ['survey'], modules: ['survey', 'technician'] },
  { keys: ['install', 'technic', 'operat'], modules: ['installation', 'technician', 'survey', 'warehouse'] },
  { keys: ['warehouse', 'inventory', 'logistics'], modules: ['warehouse'] },
  { keys: ['support', 'service', 'warranty'], modules: ['support'] },
  { keys: ['finance', 'account', 'billing'], modules: ['finance'] },
  { keys: ['subsidy', 'documentation'], modules: ['subsidy'] },
];

export function modulesFor(profile, deptText) {
  if (profile.account_type === 'admin' || String(profile.roles?.code || '').toLowerCase() === 'admin') {
    return ['admin', 'sales', 'survey', 'installation', 'warehouse', 'support', 'finance', 'subsidy', 'technician'];
  }
  if (profile.account_type === 'customer') return ['customer'];
  const set = new Set();
  for (const rule of MODULES_BY_DEPARTMENT) {
    if (rule.keys.some((k) => deptText.includes(k))) rule.modules.forEach((m) => set.add(m));
  }
  return [...set];
}

export function homeForPortal(portal, modules) {
  if (portal === 'admin') return '/admin/dashboard';
  if (portal === 'customer') return '/customer/dashboard';
  if (portal === 'sales') return '/sales/dashboard';
  if (portal === 'technician') return '/technician/dashboard';
  if (portal === 'staff') {
    const order = ['warehouse', 'support', 'finance', 'subsidy'];
    const first = order.find((m) => modules.includes(m));
    return first ? `/${first}/dashboard` : '/pending-approval';
  }
  return '/pending-approval';
}

export async function loadProfileByAuthId(adminClient, authUserId) {
  const { data, error } = await adminClient
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  return { profile: data || null, error };
}

export async function buildSessionUser(adminClient, authUser, profile) {
  const deptText = await collectDepartmentText(adminClient, profile);
  const portal = portalForProfile(profile, deptText);
  const modules = modulesFor(profile, deptText);
  return {
    id: profile.id,
    auth_user_id: authUser.id,
    email: authUser.email || profile.email,
    full_name: profile.full_name,
    phone: profile.phone,
    account_type: profile.account_type,
    role: profile.roles?.code || null,
    department: profile.departments?.name || null,
    department_code: profile.departments?.code || null,
    portal, // admin | customer | sales | technician | staff | null (pending approval)
    modules,
    is_active: profile.is_active,
    approved: portal !== null,
    home: homeForPortal(portal, modules),
  };
}
