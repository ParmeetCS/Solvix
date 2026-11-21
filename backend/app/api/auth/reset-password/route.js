import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { createAdminClient, createClientFromToken } from '@/lib/supabase/client';
import { forgetToken } from '@/lib/supabase/auth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/auth/reset-password { access_token, new_password }
 *
 * `access_token` is the token Supabase puts in the link of the recovery email. The account whose
 * password changes is the one that token belongs to, verified with Supabase. It is never taken from
 * the request body, so a caller cannot reset someone else's password.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const accessToken = String(body.access_token || '');
    const newPassword = String(body.new_password || '');

    if (!accessToken) return jsonError('This reset link is invalid. Request a new one.', 400);
    if (newPassword.length < 8) return jsonError('Your new password must be at least 8 characters.', 400);

    const { data, error } = await createClientFromToken(accessToken).auth.getUser();
    if (error || !data?.user) return jsonError('This reset link is invalid or has expired. Request a new one.', 401);

    const admin = createAdminClient();
    const { error: updateError } = await admin.auth.admin.updateUserById(data.user.id, { password: newPassword });
    if (updateError) return jsonError('Could not change the password: ' + updateError.message, 400);

    forgetToken(accessToken);
    return jsonResponse({}, { message: 'Your password has been changed. You can now sign in.' });
  } catch (error) {
    return jsonError('Internal server error: ' + error.message, 500);
  }
}
