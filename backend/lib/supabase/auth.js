// Auth helper: resolve the authenticated Supabase user from an incoming
// Next.js request. Returns { user, error }.
//
// Validating a token is a network round trip to Supabase. A page that fires
// several API calls would repeat it for each one, so successful validations are
// cached briefly (per token). A signed-out or revoked token stops working at
// most TTL seconds later, and an expired token is never accepted.
import { createClientFromToken } from './client.js';
export { createClientFromToken };

const TTL_MS = 30 * 1000;
const MAX_ENTRIES = 500;
const cache = new Map(); // token -> { user, until }

function remember(token, user) {
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(token, { user, until: Date.now() + TTL_MS });
}

export function forgetToken(token) {
  cache.delete(token);
}

export async function getUserFromRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: new Error('Missing or invalid Authorization header.') };
  }
  const accessToken = authHeader.substring(7);

  const hit = cache.get(accessToken);
  if (hit && hit.until > Date.now()) return { user: hit.user, error: null };

  const supabase = createClientFromToken(accessToken);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    cache.delete(accessToken);
    return { user: null, error: error || new Error('Unable to verify user.') };
  }
  remember(accessToken, data.user);
  return { user: data.user, error: null };
}
