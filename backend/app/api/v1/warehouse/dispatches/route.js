import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';
import { listDispatches, createDispatch } from '@/lib/warehouse/fulfilmentDb';

export async function OPTIONS() {
  return handleOptions();
}

/** GET /api/v1/warehouse/dispatches - shipments, optionally filtered by status. */
export async function GET(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const status = new URL(request.url).searchParams.get('status') || '';
    const dispatches = authResult.adminClient
      ? await listDispatches(authResult.adminClient, { status })
      : await warehouseStore.getDispatches({ status });
    return jsonResponse({ dispatches });
  } catch (error) {
    return jsonError('Failed to fetch dispatches: ' + error.message, error.status || 500);
  }
}

/**
 * POST /api/v1/warehouse/dispatches
 * Creates the shipment for a packed order. Stock leaves the warehouse exactly once, here.
 */
export async function POST(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json();

    if (!body.order_id) {
      return jsonError('Choose the order to dispatch.', 400);
    }

    const dispatch = adminClient
      ? await createDispatch(adminClient, body, profile)
      : await warehouseStore.createDispatch(body, profile);

    await logWarehouseActivity({
      actorId: profile.id,
      action: 'DISPATCH_AUTHORIZED',
      entityId: dispatch.id,
      entityType: 'dispatch',
      metadata: { dispatch_code: dispatch.dispatch_code, order_id: dispatch.order_id, tracking_number: dispatch.tracking_number },
    });

    return jsonResponse(dispatch, { message: `Dispatch ${dispatch.dispatch_code} created. Stock deducted.`, status: 201 });
  } catch (error) {
    return jsonError(error.message, error.status || 400);
  }
}
