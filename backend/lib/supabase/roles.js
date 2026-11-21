// Role helpers shared by the catalogue, quotation and order APIs.
import { getUserFromRequest } from './auth.js';
import { createAdminClient } from './client.js';

export function roleCodeOf(profile) {
  return String(profile?.roles?.code || '').toLowerCase();
}

export function isAdminProfile(profile) {
  const role = roleCodeOf(profile);
  return role === 'admin' || profile?.account_type === 'admin';
}

export function isManagerProfile(profile) {
  if (isAdminProfile(profile)) return true;
  const role = roleCodeOf(profile);
  if (['manager', 'sales_manager', 'sales_head', 'operations_manager'].includes(role)) return true;
  const dept = String(profile?.departments?.name || profile?.departments?.code || '').toLowerCase();
  return dept.includes('manager') || dept.includes('head');
}

export async function getProfileForUser(adminClient, authUserId) {
  const { data, error } = await adminClient
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
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !data) return { profile: null, error };
  return { profile: data, error: null };
}

/**
 * Require an authenticated Administrator.
 */
export async function requireAdmin(request) {
  const { user, error: userError } = await getUserFromRequest(request);
  if (userError || !user) {
    return { error: 'Authentication required. Missing or invalid Bearer token.', status: 401 };
  }

  const adminClient = createAdminClient();
  const { profile, error } = await getProfileForUser(adminClient, user.id);
  if (error || !profile) {
    return { error: 'User profile not found.', status: 404 };
  }
  if (!profile.is_active) {
    return { error: 'Account suspended or inactive.', status: 403 };
  }
  if (!isAdminProfile(profile)) {
    return { error: 'Administrator access required.', status: 403 };
  }

  return { user, profile, adminClient, isAdmin: true, isManager: true, error: null };
}

/**
 * Require an authenticated customer account, resolved to its customer record.
 * Customers are linked through customers.profile_id, with a verified email
 * fallback for accounts created before profile linking was added.
 */
export async function requireCustomer(request) {
  const { user, error: userError } = await getUserFromRequest(request);
  if (userError || !user) {
    return { error: 'Authentication required. Missing or invalid Bearer token.', status: 401 };
  }

  const adminClient = createAdminClient();
  const { profile, error } = await getProfileForUser(adminClient, user.id);
  if (error || !profile) {
    return { error: 'User profile not found.', status: 404 };
  }
  if (!profile.is_active) {
    return { error: 'Account suspended or inactive.', status: 403 };
  }

  let { data: customer } = await adminClient
    .from('customers')
    .select('*')
    .eq('profile_id', profile.id)
    .maybeSingle();

  if (!customer && profile.email) {
    const { data: byEmail } = await adminClient
      .from('customers')
      .select('*')
      .ilike('email', profile.email)
      .limit(1)
      .maybeSingle();

    // Never grant a customer record that is already linked to another
    // profile, even when the email happens to match.
    if (byEmail && (!byEmail.profile_id || byEmail.profile_id === profile.id)) {
      customer = byEmail;

      // Self-heal the link only when the email matches and no other profile owns it.
      if (!byEmail.profile_id) {
        const { data: linked, error: linkError } = await adminClient
          .from('customers')
          .update({ profile_id: profile.id, updated_at: new Date().toISOString() })
          .eq('id', byEmail.id)
          .is('profile_id', null)
          .select('*')
          .maybeSingle();

        if (linkError) {
          return {
            error: 'Failed to link your customer record. Please contact SOLVIX support.',
            status: 500,
          };
        }
        customer = linked || byEmail;
      }
    }
  }

  if (!customer) {
    return {
      error: 'No customer record is linked to this account. Please contact SOLVIX support.',
      status: 403,
    };
  }

  return { user, profile, customer, adminClient, error: null };
}

export default {
  roleCodeOf,
  isAdminProfile,
  isManagerProfile,
  getProfileForUser,
  requireAdmin,
  requireCustomer,
};
