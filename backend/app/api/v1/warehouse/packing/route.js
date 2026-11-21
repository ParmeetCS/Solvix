import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/warehouse/packing
 * Returns orders eligible for warehouse packing and preparation.
 */
export async function GET(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const queue = await warehouseStore.getPackingQueue();
    return jsonResponse({ packingQueue: queue });
  } catch (error) {
    return jsonError('Failed to fetch packing queue: ' + error.message, 500);
  }
}
