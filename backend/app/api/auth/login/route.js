import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';
import { buildSessionUser, loadProfileByAuthId } from '@/lib/supabase/session';

export async function OPTIONS() {
  return handleOptions();
}

const PORTALS = ['admin', 'customer', 'sales', 'technician', 'staff'];
const PORTAL_LABEL = {
  admin: 'Administrator',
  customer: 'Customer',
  sales: 'Sales',
  technician: 'Technician',
  staff: 'Operations staff',
};

/**
 * POST /api/auth/login  { email, password, portal }
 *
 * Each user type signs in through its own portal. The password is checked by
 * Supabase Auth, then the account's REAL portal (derived from account_type and
 * approved departments) must equal the portal being used. A customer cannot
 * sign in through the admin or sales portal, and vice versa.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const portal = String(body.portal || '').toLowerCase();

    if (!email || !password) return jsonError('Email and password are required.', 400);
    if (!PORTALS.includes(portal)) return jsonError('Unknown sign-in portal.', 400);

    let adminSupa;
    try {
      adminSupa = createAdminClient();
    } catch {
      return jsonError('Server is not configured. Add Supabase credentials to backend/.env.local.', 500);
    }

    // Separate client for the password check: after signing in, a client acts as that user (and RLS hides
    // their department), so it must never be reused for the service-role lookups below.
    const authClient = createAdminClient();
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({ email, password });
    if (authError || !authData?.user || !authData?.session) {
      return jsonError('Invalid email or password.', 401);
    }

    const { profile } = await loadProfileByAuthId(adminSupa, authData.user.id);
    if (!profile) {
      return jsonError('No SOLVIX profile is linked to this account. Contact an Administrator.', 403);
    }
    if (!profile.is_active) {
      return jsonError('This account has been suspended. Contact an Administrator.', 403);
    }

    const user = await buildSessionUser(adminSupa, authData.user, profile);
    const session = {
      token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_at: authData.session.expires_at,
      user,
    };

    if (user.portal === null) {
      // Employee whose department has not been approved yet: only the employee
      // portals may sign them in, and they land on the pending-approval page.
      if (portal === 'customer' || portal === 'admin') {
        return jsonError(`This account cannot sign in through the ${PORTAL_LABEL[portal]} portal.`, 403);
      }
      return jsonResponse(session, { message: 'Account pending approval' });
    }

    if (user.portal !== portal) {
      const actual = PORTAL_LABEL[user.portal] || user.portal;
      return jsonError(
        `These credentials belong to a ${actual} account. Please use the ${actual} sign-in page.`,
        403,
      );
    }

    return jsonResponse(session, { message: 'Login successful' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}
