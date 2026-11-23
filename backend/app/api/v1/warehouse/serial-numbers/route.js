import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { listSerials, registerSerial, registerBatch } from '@/lib/warehouse/serialDb';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/warehouse/serial-numbers
 * Registered equipment serial numbers, filtered by product, status or search text.
 */
export async function GET(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { searchParams } = new URL(request.url);
    const serialNumbers = await listSerials(authResult.adminClient, {
      product_id: searchParams.get('product_id') || '',
      status: searchParams.get('status') || '',
      search: searchParams.get('search') || '',
    });
    return jsonResponse({ serialNumbers });
  } catch (error) {
    return jsonError('Failed to fetch serial numbers: ' + error.message, error.status || 500);
  }
}

/**
 * POST /api/v1/warehouse/serial-numbers
 * Registers one serial number, or a batch ({ batch: [...] }). Each serial number can exist only once.
 */
export async function POST(request) {
  try {
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json();

    if (Array.isArray(body.batch)) {
      const batchResult = await registerBatch(adminClient, body.batch, profile);
      await logWarehouseActivity({
        actorId: profile.id,
        action: 'SERIALS_BATCH_REGISTERED',
        entityType: 'serial_number',
        metadata: { registeredCount: batchResult.registeredCount, failedCount: batchResult.failedCount },
      });
      return jsonResponse(batchResult, { message: `Batch registration complete: ${batchResult.registeredCount} added, ${batchResult.failedCount} skipped.` });
    }

    const serialRecord = await registerSerial(adminClient, body, profile);
    await logWarehouseActivity({
      actorId: profile.id,
      action: 'SERIAL_REGISTERED',
      entityId: serialRecord.id,
      entityType: 'serial_number',
      metadata: { serial_number: serialRecord.serial_number, product_id: serialRecord.product_id },
    });
    return jsonResponse(serialRecord, { message: 'Serial number registered successfully.', status: 201 });
  } catch (error) {
    return jsonError(error.message, error.status || 400);
  }
}
