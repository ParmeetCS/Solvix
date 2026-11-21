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

// POST /api/auth/reset-password
export async function POST(request) {
  try {
    const body = await request.json();

    const { token, new_password, user_id } = body;

    if (!token) {
      return jsonError('Reset token is required', 400);
    }

    if (!new_password || new_password.length < 6) {
      return jsonError('New password must be at least 6 characters', 400);
    }

    const adminSupa = createAdminClient();
    // Update the user's password using the magic link token
    const { error } = await adminSupa.auth.updateUserById(user_id, new_password);

    if (error) {
      return jsonError('Failed to reset password: ' + error.message, 400);
    }

    return jsonResponse({
      message: 'Password has been reset successfully. You can now log in with your new password.',
    }, { status: 200, message: 'Password reset successful' });

  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}