import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/warehouse/products/[id]
 * Fetch product details, stock across warehouses, movements, and serials.
 */
export async function GET(request, { params }) {
  try {
    const { id } = (await params) || {};
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const data = await warehouseStore.getProductById(id);
    if (!data) {
      return jsonError('Product not found.', 404);
    }

    return jsonResponse(data);
  } catch (error) {
    return jsonError('Failed to fetch product details: ' + error.message, 500);
  }
}

/**
 * PATCH /api/v1/warehouse/products/[id]
 * Update product specifications, prices, or status.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = (await params) || {};
    const authResult = await requireWarehouseAccess(request, { requireManage: true });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile } = authResult;
    const body = await request.json();

    const updated = await warehouseStore.updateProduct(id, body, profile);
    if (!updated) {
      return jsonError('Product not found.', 404);
    }

    await logWarehouseActivity({
      actorId: profile.id,
      action: 'PRODUCT_UPDATED',
      entityId: id,
      entityType: 'product',
      metadata: { updates: Object.keys(body) }
    });

    return jsonResponse(updated, { message: 'Product updated successfully.' });
  } catch (error) {
    return jsonError('Failed to update product: ' + error.message, 500);
  }
}
