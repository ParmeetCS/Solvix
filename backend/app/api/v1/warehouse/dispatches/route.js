import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/warehouse/dispatches
 * Lists dispatches with status filter.
 */
export async function GET(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    const dispatches = await warehouseStore.getDispatches({ status });
    return jsonResponse({ dispatches });
  } catch (error) {
    return jsonError('Failed to fetch dispatches: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/warehouse/dispatches
 * Creates dispatch and executes transactional inventory deduction exactly once.
 */
export async function POST(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile } = authResult;
    const body = await request.json();

    if (!body.order_id) {
      return jsonError('Order ID is required to create a dispatch.', 400);
    }

    const dispatch = await warehouseStore.createDispatch(body, profile);

    await logWarehouseActivity({
      actorId: profile.id,
      action: 'DISPATCH_AUTHORIZED',
      entityId: dispatch.id,
      entityType: 'dispatch',
      metadata: { dispatch_code: dispatch.dispatch_code, order_id: dispatch.order_id, tracking_number: dispatch.tracking_number }
    });

    return jsonResponse(dispatch, {
      message: `Dispatch ${dispatch.dispatch_code} authorized! Inventory deducted transactionally.`,
      status: 201
    });
  } catch (error) {
    return jsonError(error.message, 400);
  }
}
