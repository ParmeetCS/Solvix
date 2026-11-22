import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';
import { packingDetail, reserveStock, completePacking } from '@/lib/warehouse/fulfilmentDb';

export async function OPTIONS() {
  return handleOptions();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idOrUndefined = (v) => (UUID.test(v || '') ? v : undefined);

/** GET /api/v1/warehouse/packing/[orderId] - the order, its items, reservation and packing progress. */
export async function GET(request, { params }) {
  try {
    const { orderId } = (await params) || {};
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const data = authResult.adminClient
      ? await packingDetail(authResult.adminClient, orderId)
      : await warehouseStore.getOrderPackingDetail(orderId);
    if (!data) {
      return jsonError('Order not found.', 404);
    }
    return jsonResponse(data);
  } catch (error) {
    return jsonError('Failed to fetch order packing details: ' + error.message, error.status || 500);
  }
}

/**
 * POST /api/v1/warehouse/packing/[orderId]
 *  { action: 'reserve', warehouse_id? }                              reserve stock for the order
 *  { action: 'complete_packing', packed_items, serial_numbers }       mark items packed, record serials
 */
export async function POST(request, { params }) {
  try {
    const { orderId } = (await params) || {};
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json();
    const { action, warehouse_id, packed_items, serial_numbers } = body;

    if (action === 'reserve') {
      const res = adminClient
        ? await reserveStock(adminClient, orderId, warehouse_id, profile)
        : await warehouseStore.reserveOrderStock(orderId, warehouse_id || 'wh-1', profile);
      await logWarehouseActivity({ actorId: profile.id, action: 'INVENTORY_RESERVED', entityId: idOrUndefined(orderId), entityType: 'order', metadata: { warehouse_id } });
      return jsonResponse(res, { message: 'Stock reserved for this order.' });
    }

    if (action === 'complete_packing' || action === 'update_checklist') {
      let res;
      if (adminClient) {
        res = await completePacking(adminClient, orderId, packed_items || {}, serial_numbers || {}, profile);
      } else {
        const list = Array.isArray(packed_items)
          ? packed_items
          : Object.entries(packed_items || {}).filter(([, v]) => v).map(([product_id]) => ({ product_id, quantity_packed: 999999 }));
        res = await warehouseStore.updatePackingChecklist(orderId, list, profile);
      }
      await logWarehouseActivity({ actorId: profile.id, action: 'PACKING_CHECKLIST_UPDATED', entityId: idOrUndefined(orderId), entityType: 'order', metadata: { all_packed: res.all_packed ?? res.allPacked } });
      return jsonResponse(res, { message: 'Packing saved.' });
    }

    return jsonError('Invalid packing action. Use "reserve" or "complete_packing".', 400);
  } catch (error) {
    return jsonError(error.message, error.status || 400);
  }
}
