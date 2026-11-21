import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/warehouse/purchase-orders/[id]/receive
 * Records verified goods receiving (including partial deliveries) and updates warehouse stock.
 */
export async function POST(request, { params }) {
  try {
    const { id } = (await params) || {};
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile } = authResult;
    const body = await request.json();
    const { items } = body;

    if (!items || items.length === 0) {
      return jsonError('Received items list is required.', 400);
    }

    const updatedPO = await warehouseStore.receiveGoods(id, items, profile);

    await logWarehouseActivity({
      actorId: profile.id,
      action: 'GOODS_RECEIVED',
      entityId: id,
      entityType: 'purchase_order',
      metadata: { po_code: updatedPO.po_code, status: updatedPO.status }
    });

    return jsonResponse(updatedPO, { message: 'Goods receipt verified and inventory restocked successfully.' });
  } catch (error) {
    return jsonError(error.message, 400);
  }
}
