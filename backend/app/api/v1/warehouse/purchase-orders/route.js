import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/warehouse/purchase-orders
 * List purchase orders with status filter.
 */
export async function GET(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    const purchaseOrders = await warehouseStore.getPurchaseOrders({ status });
    return jsonResponse({ purchaseOrders });
  } catch (error) {
    return jsonError('Failed to fetch purchase orders: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/warehouse/purchase-orders
 * Create a new purchase order.
 * Note: Creating a PO does NOT increase stock!
 */
export async function POST(request) {
  try {
    const authResult = await requireWarehouseAccess(request, { requireManage: true });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile } = authResult;
    const body = await request.json();

    if (!body.supplier_name || !body.items || body.items.length === 0) {
      return jsonError('Supplier name and at least one order item are required.', 400);
    }

    const po = await warehouseStore.createPurchaseOrder(body, profile);

    await logWarehouseActivity({
      actorId: profile.id,
      action: 'PURCHASE_ORDER_CREATED',
      entityId: po.id,
      entityType: 'purchase_order',
      metadata: { po_code: po.po_code, total_amount: po.total_amount }
    });

    return jsonResponse(po, { message: `Purchase order ${po.po_code} created successfully.`, status: 201 });
  } catch (error) {
    return jsonError('Failed to create purchase order: ' + error.message, 500);
  }
}
