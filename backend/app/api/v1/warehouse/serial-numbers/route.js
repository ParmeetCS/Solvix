import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/warehouse/serial-numbers
 * Lists registered equipment serial numbers with search, status, and product filters.
 */
export async function GET(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { searchParams } = new URL(request.url);
    const product_id = searchParams.get('product_id') || '';
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    const serialNumbers = await warehouseStore.getSerialNumbers({ product_id, status, search });
    return jsonResponse({ serialNumbers });
  } catch (error) {
    return jsonError('Failed to fetch serial numbers: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/warehouse/serial-numbers
 * Registers a single serial number or batch via CSV payload.
 * Enforces uniqueness.
 */
export async function POST(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile } = authResult;
    const body = await request.json();

    // Check if batch registration
    if (Array.isArray(body.batch)) {
      const batchResult = await warehouseStore.registerBatchSerials(body.batch, profile);
      await logWarehouseActivity({
        actorId: profile.id,
        action: 'SERIALS_BATCH_REGISTERED',
        entityType: 'serial_number',
        metadata: { registeredCount: batchResult.registeredCount, failedCount: batchResult.failedCount }
      });
      return jsonResponse(batchResult, { message: `Batch registration complete: ${batchResult.registeredCount} added.` });
    }

    if (!body.serial_number || !body.product_id) {
      return jsonError('Serial number and Product ID are required.', 400);
    }

    const serialRecord = await warehouseStore.registerSerialNumber(body, profile);

    await logWarehouseActivity({
      actorId: profile.id,
      action: 'SERIAL_REGISTERED',
      entityId: serialRecord.id,
      entityType: 'serial_number',
      metadata: { serial_number: serialRecord.serial_number, product_id: serialRecord.product_id }
    });

    return jsonResponse(serialRecord, { message: 'Serial number registered successfully.', status: 201 });
  } catch (error) {
    return jsonError(error.message, 400);
  }
}
