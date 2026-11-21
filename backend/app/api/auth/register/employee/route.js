import { jsonResponse, jsonError, handleOptions, corsHeaders } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';

export async function GET() {
  return jsonResponse({ name: 'SOLVIX Auth API', version: '1.0.0' }, {
    message: 'SOLVIX Auth v1',
    headers: corsHeaders(),
  });
}

// Handle CORS preflight for /api/auth/*
export async function OPTIONS() {
  return handleOptions();
}

// POST /api/auth/register/employee
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.password || !body.full_name || !body.requested_department) {
      return jsonError('Missing required fields: email, password, full_name, requested_department', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return jsonError('Invalid email format', 400);
    }

    // Validate password length
    if (body.password.length < 6) {
      return jsonError('Password must be at least 6 characters', 400);
    }

    // Check if password and confirm_password match
    if (body.password !== (body.confirm_password || '')) {
      return jsonError('Password and confirm password do not match', 400);
    }

    // Create user in Supabase Auth
    const adminSupa = createAdminClient();
    // Created directly (no confirmation email): employees cannot do anything until an
    // Administrator approves their department, and Supabase's built-in email sender is
    // limited to a few emails per hour, which used to block registrations.
    const { data: authData, error: authError } = await adminSupa.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name,
        phone: body.phone || '',
        employee_id: body.employee_id || '',
        account_type: 'employee',
        department_requested: body.requested_department,
      },
    });

    if (authError) {
      return jsonError(/already|registered|exists/i.test(authError.message || '') ? 'An account with this email already exists. Try signing in instead.' : (authError.message || 'Signup failed'), 400);
    }

    if (!authData.user) {
      return jsonError('Signup succeeded but no user returned', 500);
    }

    // Create profile linked to auth user with pending department assignment
    const { data: profileData, error: profileError } = await adminSupa
      .from('profiles')
      .insert({
        auth_user_id: authData.user.id,
        email: body.email,
        full_name: body.full_name,
        phone: body.phone || '',
        account_type: 'employee',
        department_id: null, // Will be set by Admin later
        department_requested: body.requested_department, // Requested department (pending approval)
        is_active: true,
        role_id: null, // Will be set by Admin later
      })
      .select()
      .single();

    if (profileError) {
      // Attempt to clean up: delete the auth user if profile creation fails
      try {
        await adminSupa.auth.admin.deleteUser(authData.user.id);
      } catch (e) {
        // Ignore cleanup errors
      }
      return jsonError('Failed to create user profile: ' + profileError.message, 400, { profileError });
    }

    // Return success - account is pending Admin approval
    return jsonResponse({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: authData.user.user_metadata?.full_name,
      },
      profile: profileData,
      message: 'Employee access request submitted successfully. Account pending Admin approval.',
    }, { status: 201, message: 'Employee access request submitted successfully' });

  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}