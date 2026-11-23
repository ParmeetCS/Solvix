import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess } from '@/lib/supabase/warehouseAuth';
import { lookupSerial } from '@/lib/warehouse/serialDb';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/warehouse/serial-numbers/lookup?q=...
 * Finds equipment from a typed serial number or a scanned QR payload.
 */
export async function GET(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('serial') || searchParams.get('qr') || '';
    if (!query) {
      return jsonError('Search query parameter "q" or "serial" is required.', 400);
    }

    const result = await lookupSerial(authResult.adminClient, query);
    if (!result) {
      return jsonError('No equipment found matching this serial number or QR code.', 404);
    }
    return jsonResponse(result);
  } catch (error) {
    return jsonError('Error looking up serial number: ' + error.message, error.status || 500);
  }
}
