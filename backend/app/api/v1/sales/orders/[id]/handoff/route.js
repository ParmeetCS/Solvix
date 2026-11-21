import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';
import { getOrderBundle, assertOrderAccess, recordOrderStatus } from '@/lib/quotation/data';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/sales/orders/[id]/handoff
 * Makes a confirmed/paid order available to the Warehouse team for
 * preparation and dispatch. This endpoint does not implement warehouse or
 * installation workflows; it only records the handoff.
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireSalesOrAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const { id } = await params;

    const bundle = await getOrderBundle(auth.adminClient, id);
    const order = bundle.order;
    assertOrderAccess(order, auth.profile, auth.isAdmin);

    if (order.warehouse_handoff_at) {
      return jsonResponse(
        { order: bundle.order, already_handed_off: true },
        { message: 'Order has already been handed off to Warehouse.' }
      );
    }

    if (order.status === 'cancelled') {
      return jsonError('A cancelled order cannot be handed off to Warehouse.', 409);
    }
    if (!['confirmed', 'processing', 'awaiting_dispatch'].includes(order.status)) {
      return jsonError('The order must be confirmed and have a recorded payment before Warehouse handoff.', 409);
    }
    if (!['partial', 'paid'].includes(order.payment_status)) {
      return jsonError('Record an advance or full payment before Warehouse handoff.', 409);
    }

    const body = await request.json().catch(() => ({}));
    const now = new Date().toISOString();
    const previousStatus = order.status;
    const nextStatus = previousStatus === 'awaiting_dispatch' ? previousStatus : 'awaiting_dispatch';

    const { data: updated, error } = await auth.adminClient
      .from('orders')
      .update({
        warehouse_handoff_at: now,
        warehouse_handoff_by: auth.profile.id,
        handoff_notes: body.notes || null,
        status: nextStatus,
        updated_at: now,
        updated_by: auth.profile.id,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return jsonError('Failed to hand off order: ' + error.message, 500);

    if (nextStatus !== previousStatus) {
      await recordOrderStatus({
        adminClient: auth.adminClient,
        orderId: id,
        previousStatus,
        newStatus: nextStatus,
        actorId: auth.profile.id,
        notes: body.notes || 'Order handed off to Warehouse for preparation and dispatch',
      });
    }

    await logActivity({
      actorId: auth.profile.id,
      action: 'ORDER_HANDED_OFF_TO_WAREHOUSE',
      entityType: 'order',
      entityId: id,
      metadata: {
        order_code: order.order_code,
        previous_status: previousStatus,
        new_status: nextStatus,
        notes: body.notes || null,
      },
    });

    const refreshed = await getOrderBundle(auth.adminClient, id);
    return jsonResponse(refreshed, { message: 'Order is now available to Warehouse.' });
  } catch (error) {
    return jsonError(error.message || 'Failed to hand off order.', error.status || 500);
  }
}
