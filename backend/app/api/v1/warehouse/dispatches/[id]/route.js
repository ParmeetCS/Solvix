import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';
import { getDispatch } from '@/lib/warehouse/fulfilmentDb';

export async function OPTIONS() {
  return handleOptions();
}

/** GET /api/v1/warehouse/dispatches/[id] - one shipment with its items and warranties. */
export async function GET(request, { params }) {
  try {
    const { id } = (await params) || {};
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const dispatch = authResult.adminClient
      ? await getDispatch(authResult.adminClient, id)
      : await warehouseStore.getDispatchById(id);
    if (!dispatch) {
      return jsonError('Dispatch not found.', 404);
    }
    return jsonResponse(dispatch);
  } catch (error) {
    return jsonError('Failed to fetch dispatch: ' + error.message, error.status || 500);
  }
}
