// Server-side Supabase client utilities for the SOLVIX backend.
//
// IMPORTANT: The service-role key bypasses Row Level Security and must never
// be exposed to the frontend. It is used only here, on the server, for
// privileged/bootstrap operations. All user-facing operations use
// createClientFromToken(token) so RLS is enforced as the authenticated user.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Admin client (service role). Server only — bypasses RLS.
export function createAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// User-scoped client. Runs Supabase as the authenticated user so RLS applies.
// Pass the user's JWT (Bearer token) obtained from the Authorization header.
export function createClientFromToken(accessToken) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
