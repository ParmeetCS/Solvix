import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';
import { receivePurchaseOrder } from '@/lib/warehouse/poDb';

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

    const { profile, adminClient } = authResult;
    const body = await request.json();
    const items = body.items || body.received_items;

    if (!items || items.length === 0) {
      return jsonError('Received items list is required.', 400);
    }

    let updatedPO = adminClient ? await receivePurchaseOrder(adminClient, id, items, profile) : null;
    if (!updatedPO) updatedPO = (await warehouseStore.receiveGoods(id, items, profile)).purchase_order || null;
    if (!updatedPO) return jsonError('Purchase order not found.', 404);

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
