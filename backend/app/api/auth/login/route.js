import { jsonResponse, jsonError, handleOptions, corsHeaders } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';
import { createClientFromToken, getUserFromRequest } from '@/lib/supabase/auth';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    // If request contains email and password in body, sign in with Supabase Auth
    if (body.email && body.password) {
      const adminSupa = createAdminClient();
      const { data: authData, error: authError } = await adminSupa.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });

      if (authError || !authData.user) {
        return jsonError(authError?.message || 'Invalid email or password', 401);
      }

      // Check account status via profiles table
      let { data: profileData, error: profileError } = await adminSupa
        .from('profiles')
        .select('full_name, account_type, role_id, department_id, is_active')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle();

      // Auto-heal: If profile record is missing, auto-create it
      if (!profileData) {
        const meta = authData.user.user_metadata || {};
        const accountType = meta.account_type || 'customer';
        const fullName = meta.full_name || body.email.split('@')[0];
        const { data: newProfile } = await adminSupa
          .from('profiles')
          .insert({
            auth_user_id: authData.user.id,
            email: authData.user.email,
            full_name: fullName,
            account_type: accountType,
            is_active: true,
          })
          .select('full_name, account_type, role_id, department_id, is_active')
          .maybeSingle();

        profileData = newProfile || {
          full_name: fullName,
          account_type: accountType,
          role_id: null,
          department_id: null,
          is_active: true,
        };
      }

      return jsonResponse({
        token: authData.session?.access_token,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name: profileData.full_name,
          account_type: profileData.account_type,
          role: profileData.role_id,
          department: profileData.department_id,
          is_active: profileData.is_active,
        },
      }, { message: 'Login successful' });
    }

    // Otherwise fall back to Authorization header check
    const { user, error } = await getUserFromRequest(request);
    if (error || !user) {
      return jsonError('Authentication failed: ' + (error?.message || 'Invalid credentials'), 401);
    }

    const adminSupa = createAdminClient();
    const { data: profileData, error: profileError } = await adminSupa
      .from('profiles')
      .select('full_name, account_type, role_id, department_id, is_active')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profileData) {
      return jsonError('User profile not found', 404);
    }

    return jsonResponse({
      user: {
        id: user.id,
        email: user.email,
        full_name: profileData.full_name,
        account_type: profileData.account_type,
        role: profileData.role_id,
        department: profileData.department_id,
        is_active: profileData.is_active,
      },
    }, { message: 'Login successful' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/auth/*
export async function OPTIONS() {
  return handleOptions();
}