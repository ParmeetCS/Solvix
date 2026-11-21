import { jsonResponse, jsonError, handleOptions, corsHeaders } from '@/lib/utils';
import { createClientFromToken, getUserFromRequest } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/client';

export async function GET(request) {
  try {
    // Try to get user from the request authentication first
    const { data: authData, error: authError } = await getUserFromRequest(request);

    let userInfo = null;

    if (authData && authData.user) {
      // User is authenticated via request header
      userInfo = {
        id: authData.user.id,
        email: authData.user.email,
        full_name: null,
      };
    } else {
      // Try to get user from Supabase session (cookie-based)
      const supa = createClientFromToken('');
      const { data: supaData, error: supaError } = await supa.auth.getUser();

      if (supaError || !supaData.user) {
        return jsonError('Not authenticated', 401);
      }

      // Fetch profile data from the profiles table
      const adminSupa = createAdminClient();
      const { data: profileData, error: profileError } = await adminSupa
        .from('profiles')
        .select('full_name, account_type, role_id, department_id, is_active')
        .eq('auth_user_id', supaData.user.id)
        .single();

      if (profileError) {
        return jsonError('Profile not found', 404);
      }

      userInfo = {
        id: supaData.user.id,
        email: supaData.user.email,
        full_name: profileData.full_name,
        account_type: profileData.account_type,
        role: profileData.role_id,
        department: profileData.department_id,
        is_active: profileData.is_active,
      };
    }

    return jsonResponse({
      user: userInfo,
    });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}

// Handle CORS preflight for /api/auth/*
export async function OPTIONS() {
  return handleOptions();
}