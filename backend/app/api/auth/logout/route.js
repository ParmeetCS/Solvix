import { jsonResponse, handleOptions } from '@/lib/utils';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/auth/logout
 * Tokens are held by the browser (no server session), so logout is completed
 * client-side by discarding them. This endpoint exists for API symmetry.
 */
export async function POST() {
  return jsonResponse({ loggedOut: true }, { message: 'Logged out successfully' });
}
