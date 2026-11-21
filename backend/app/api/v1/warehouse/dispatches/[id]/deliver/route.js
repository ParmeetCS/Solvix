import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireWarehouseAccess, logWarehouseActivity } from '@/lib/supabase/warehouseAuth';
import { warehouseStore } from '@/lib/warehouse/warehouseStore';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/warehouse/dispatches/[id]/deliver
 * Confirms equipment delivery at customer site.
 * CRITICAL BUSINESS RULE:
 * The warranty clock starts strictly from equipment delivery, not installation!
 */
export async function POST(request, { params }) {
  try {
    const { id } = (await params) || {};
    const authResult = await requireWarehouseAccess(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile } = authResult;
    const body = await request.json().catch(() => ({}));

    const result = await warehouseStore.confirmEquipmentDelivery(id, body, profile);

    await logWarehouseActivity({
      actorId: profile.id,
      action: 'DELIVERY_CONFIRMED_WARRANTY_TRIGGERED',
      entityId: id,
      entityType: 'dispatch',
      metadata: {
        actual_delivery_date: result.actual_delivery_date,
        warranties_activated: result.warranties_activated.length
      }
    });

    return jsonResponse(result, {
      message: `Equipment delivery confirmed on ${result.actual_delivery_date}! ${result.warranties_activated.length} warranty record(s) activated.`
    });
  } catch (error) {
    return jsonError(error.message, 400);
  }
}
