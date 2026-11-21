import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/warehouse/packing/[orderId]
 * Retrieves order details, Bill of Materials (BOM), available stock, and packing progress.
 */
export async function GET(request, { params }) {
  try {
    const { orderId } = (await params) || {};
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const data = await warehouseStore.getOrderPackingDetail(orderId);
    if (!data) {
      return jsonError('Order not found.', 404);
    }

    return jsonResponse(data);
  } catch (error) {
    return jsonError('Failed to fetch order packing details: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/warehouse/packing/[orderId]
 * Action:
 * - 'reserve': Reserves inventory for this order (prevents double reservation)
 * - 'update_checklist': Marks items packed, records packed quantities
 */
export async function POST(request, { params }) {
  try {
    const { orderId } = (await params) || {};
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile } = authResult;
    const body = await request.json();
    const { action, warehouse_id, packed_items } = body;

    if (action === 'reserve') {
      const res = await warehouseStore.reserveOrderStock(orderId, warehouse_id || 'wh-1', profile);
      await logWarehouseActivity({
        actorId: profile.id,
        action: 'INVENTORY_RESERVED',
        entityId: orderId,
        entityType: 'order',
        metadata: { warehouse_id }
      });
      return jsonResponse(res, { message: 'Stock successfully reserved for order preparation.' });
    } else if (action === 'update_checklist') {
      const res = await warehouseStore.updatePackingChecklist(orderId, packed_items || [], profile);
      await logWarehouseActivity({
        actorId: profile.id,
        action: 'PACKING_CHECKLIST_UPDATED',
        entityId: orderId,
        entityType: 'order',
        metadata: { allPacked: res.allPacked }
      });
      return jsonResponse(res, {
        message: res.allPacked ? 'All items packed and verified!' : 'Packing progress saved.'
      });
    }

    return jsonError('Invalid packing action. Use "reserve" or "update_checklist".', 400);
  } catch (error) {
    return jsonError(error.message, 400);
  }
}
