import { jsonResponse, jsonError, handleOptions, corsHeaders } from '@/lib/utils';
import { createClientFromToken, getUserFromRequest } from '@/lib/supabase/auth';

export async function POST(request) {
  try {
    // Get authenticated user from request
    const { user, error } = await getUserFromRequest(request);

    if (error) {
      return jsonError('Authentication failed: ' + error.message, 401);
    }

    if (!user) {
      return jsonError('Invalid email or password', 401);
    }

    // Check account status via profiles table
    const adminSupa = createAdminClient();
    const { data: profileData, error: profileError } = await adminSupa
      .from('profiles')
      .select('full_name, account_type, role_id, department_id, is_active')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profileData) {
      return jsonError('User profile not found', 404);
    }

    // Return user info
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