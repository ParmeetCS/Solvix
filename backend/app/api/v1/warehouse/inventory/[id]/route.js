import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/warehouse/inventory/[id]
 * Handles stock operations: stock_in, stock_out, adjustment, transfer
 */
export async function POST(request, { params }) {
  try {
    const { id } = (await params) || {};
    const body = await request.json();
    const { action, warehouse_id, quantity, destination_warehouse_id, notes, reason } = body;

    // Manual adjustment requires special permission check
    const isAdjustment = action === 'adjustment';
    const authResult = await requireWarehouseAccess(request, { requireAdjustment: isAdjustment });
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile } = authResult;
    let result;

    if (action === 'stock_in') {
      result = await warehouseStore.recordStockIn({
        product_id: id,
        warehouse_id: warehouse_id || 'wh-1',
        quantity,
        reference_type: 'manual_receipt',
        notes
      }, profile);
    } else if (action === 'stock_out') {
      result = await warehouseStore.recordStockOut({
        product_id: id,
        warehouse_id: warehouse_id || 'wh-1',
        quantity,
        notes
      }, profile);
    } else if (action === 'adjustment') {
      result = await warehouseStore.recordStockAdjustment({
        product_id: id,
        warehouse_id: warehouse_id || 'wh-1',
        new_quantity: quantity,
        reason: reason || notes
      }, profile);
    } else if (action === 'transfer') {
      result = await warehouseStore.recordStockTransfer({
        product_id: id,
        source_warehouse_id: warehouse_id,
        destination_warehouse_id,
        quantity,
        notes
      }, profile);
    } else {
      return jsonError('Invalid stock operation action. Supported: stock_in, stock_out, adjustment, transfer.', 400);
    }

    await logWarehouseActivity({
      actorId: profile.id,
      action: `STOCK_${action.toUpperCase()}`,
      entityId: id,
      entityType: 'inventory',
      metadata: { action, quantity, warehouse_id }
    });

    return jsonResponse(result, { message: `Stock ${action} executed successfully.` });
  } catch (error) {
    return jsonError(error.message, 400);
  }
}
