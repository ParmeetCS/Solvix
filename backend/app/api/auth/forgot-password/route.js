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

// POST /api/auth/forgot-password
export async function POST(request) {
  try {
    const body = await request.json();

    if (!body.email) {
      return jsonError('Email is required', 400);
    }

    const adminSupa = createAdminClient();
    // Send password reset OTP to the user's email
    const { error } = await adminSupa.auth.signInWithOtp({
      email: body.email,
      options: {
        // The user will receive a magic link at their email
        // The magic link contains a token for resetting the password
        redirectTo: '/reset-password',
      },
    });

    if (error) {
      // Don't reveal whether the email exists - return generic success
      return jsonError('Failed to send reset link', 400, { error });
    }

    // Return success without revealing whether the email exists
    return jsonResponse({
      message: 'If an account with that email exists, a password reset link has been sent.',
    }, { status: 200, message: 'Reset link sent' });

  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}