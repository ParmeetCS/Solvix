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

// POST /api/auth/register/customer
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.password || !body.full_name) {
      return jsonError('Missing required fields: email, password, full_name', 400);
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
    // signUp may return a session when email confirmation is off; keep that client away from the database writes below.
    const authClient = createAdminClient();
    const { data: authData, error: authError } = await authClient.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          full_name: body.full_name,
          phone: body.phone || '',
          account_type: 'customer',
        },
      },
    });

    if (authError) {
      if (authError.code === 'over_email_send_rate_limit') {
        return jsonError('Too many sign-up emails have been sent recently. Please try again in about an hour.', 429);
      }
      return jsonError(authError.message || 'Signup failed', 400);
    }

    if (!authData.user) {
      return jsonError('Signup succeeded but no user returned', 500);
    }

    // For an email that is already registered, Supabase answers with a made-up user
    // (no identities) instead of an error, so inserting a profile for it would fail
    // with a foreign-key error. Report the real problem instead.
    if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
      return jsonError('An account with this email already exists. Try signing in instead.', 409);
    }

    // Create profile linked to auth user
    const { data: profileData, error: profileError } = await adminSupa
      .from('profiles')
      .insert({
        auth_user_id: authData.user.id,
        email: body.email,
        full_name: body.full_name,
        phone: body.phone || '',
        account_type: 'customer',
        is_active: true,
        role_id: null,
        department_id: null,
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

    // Create customer record
    const { data: customerData, error: customerError } = await adminSupa
      .from('customers')
      .insert({
        customer_code: 'CUST-' + authData.user.id.substring(0, 8),
        profile_id: profileData.id,
        contact_name: body.full_name,
        email: body.email,
        phone: body.phone || '',
        status: 'active',
      })
      .select()
      .single();

    if (customerError) {
      // Attempt cleanup
      try {
        await adminSupa.auth.admin.deleteUser(authData.user.id);
      } catch (e) {
        // Ignore cleanup errors
      }
      return jsonError('Failed to create customer record: ' + customerError.message, 400, { customerError });
    }

    // Return success - do NOT return the password or token
    return jsonResponse({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: authData.user.user_metadata?.full_name,
      },
      profile: profileData,
      customer: customerData,
      message: 'Customer account created successfully. Please check your email for verification.',
    }, { status: 201, message: 'Customer registered successfully' });

  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}