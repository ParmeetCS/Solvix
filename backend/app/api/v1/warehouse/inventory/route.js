import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/warehouse/inventory
 * Master inventory stock listing with warehouse, available quantities, and low stock status.
 */
export async function GET(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { searchParams } = new URL(request.url);
    const warehouse_id = searchParams.get('warehouse_id') || '';
    const low_stock_only = searchParams.get('low_stock_only') === 'true';
    const search = searchParams.get('search') || '';

    const inventory = await warehouseStore.getInventory({ warehouse_id, low_stock_only, search });
    return jsonResponse({ inventory });
  } catch (error) {
    return jsonError('Failed to fetch inventory: ' + error.message, 500);
  }
}
