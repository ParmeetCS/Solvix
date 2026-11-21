import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/warehouse/categories
 * Returns product categories and warehouse list for dropdowns.
 */
export async function GET(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const [categories, warehouses, warranties] = await Promise.all([
      warehouseStore.getCategories(),
      warehouseStore.getWarehouses(),
      warehouseStore.getWarranties()
    ]);

    return jsonResponse({ categories, warehouses, warranties });
  } catch (error) {
    return jsonError('Failed to fetch categories: ' + error.message, 500);
  }
}
