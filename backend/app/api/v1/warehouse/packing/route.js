import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';
import { packingQueue } from '@/lib/warehouse/fulfilmentDb';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/warehouse/packing
 * Orders that are confirmed (paid at least in part) and waiting for the warehouse to pack them.
 */
export async function GET(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    if (authResult.adminClient) {
      return jsonResponse({ packingQueue: await packingQueue(authResult.adminClient) });
    }

    const queue = await warehouseStore.getPackingQueue();
    return jsonResponse({ packingQueue: queue });
  } catch (error) {
    return jsonError('Failed to fetch packing queue: ' + error.message, error.status || 500);
  }
}
