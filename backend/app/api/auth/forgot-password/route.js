import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { createAdminClient } from '@/lib/supabase/client';

export async function OPTIONS() {
  return handleOptions();
}

function allowedOrigins() {
  const configured = (process.env.FRONTEND_ORIGIN || '').split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);
  return configured.length ? configured : ['http://localhost:5173', 'http://127.0.0.1:5173'];
}

const GENERIC = 'If an account with that email exists, a password reset link has been sent.';

/**
 * POST /api/auth/forgot-password { email }
 * Sends Supabase's password-recovery email. The reply is always the same, so the
 * endpoint cannot be used to find out which emails have accounts, and it never
 * creates an account.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError('Enter a valid email address.', 400);

    // Only ever redirect back to our own site.
    const origins = allowedOrigins();
    const requested = request.headers.get('origin');
    const origin = origins.includes(requested) ? requested : origins[0];

    const authClient = createAdminClient();
    const { error } = await authClient.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` });

    if (error && (error.status === 429 || error.code === 'over_email_send_rate_limit')) {
      return jsonError('Too many reset emails were requested recently. Please try again in about an hour.', 429);
    }
    if (error) console.error('Password reset email failed:', error.message);

    return jsonResponse({}, { message: GENERIC });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}
