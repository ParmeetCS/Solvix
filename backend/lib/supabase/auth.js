// Auth helper: resolve the authenticated Supabase user from an incoming
// Next.js request. Returns { user, error }.
import { createClientFromToken } from './client';
export { createClientFromToken };

export async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: new Error('Missing or invalid Authorization header.') };
  }
  const accessToken = authHeader.substring(7);
  const supabase = createClientFromToken(accessToken);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { user: null, error: error || new Error('Unable to verify user.') };
  }
  return { user: data.user, error: null };
}
