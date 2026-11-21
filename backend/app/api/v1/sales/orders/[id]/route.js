import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';
import { assertOrderTransition } from '@/lib/quotation/status';
import {
  getOrderBundle,
  assertOrderAccess,
  recordOrderStatus,
  normaliseDate,
} from '@/lib/quotation/data';

export async function OPTIONS() {
  return handleOptions();
}

async function loadOrder(auth, id) {
  const bundle = await getOrderBundle(auth.adminClient, id);
  assertOrderAccess(bundle.order, auth.profile, auth.isAdmin);
  return bundle;
}

/** GET /api/v1/sales/orders/[id] */
export async function GET(request, { params }) {
  try {
    const auth = await requireSalesOrAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const { id } = await params;
    const bundle = await loadOrder(auth, id);
    return jsonResponse(bundle);
  } catch (error) {
    return jsonError(error.message || 'Failed to load order.', error.status || 500);
  }
}

/** PATCH /api/v1/sales/orders/[id] — controlled status/ops updates. */
export async function PATCH(request, { params }) {
  try {
    const auth = await requireSalesOrAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const { id } = await params;
    const body = await request.json();
    const bundle = await loadOrder(auth, id);
    const order = bundle.order;

    const update = { updated_by: auth.profile.id, updated_at: new Date().toISOString() };

    if (body.status !== undefined) {
      const nextStatus = String(body.status);
      if (nextStatus === order.status) {
        return jsonError('Order is already in that status.', 409);
      }
      assertOrderTransition(order.status, nextStatus);
      if (nextStatus === 'cancelled' && !String(body.cancelled_reason || '').trim()) {
        return jsonError('A cancellation reason is required.', 400);
      }
      update.status = nextStatus;
      if (nextStatus === 'cancelled') update.cancelled_reason = String(body.cancelled_reason).trim();
    }

    if (body.notes !== undefined) update.notes = body.notes || null;
    if (body.scheduled_install_date !== undefined) {
      update.scheduled_install_date = normaliseDate(body.scheduled_install_date, 'scheduled_install_date');
    }

    const { data: updated, error } = await auth.adminClient
      .from('orders')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();
    if (error) return jsonError('Failed to update order: ' + error.message, 500);

    if (update.status && update.status !== order.status) {
      await recordOrderStatus({
        adminClient: auth.adminClient,
        orderId: id,
        previousStatus: order.status,
        newStatus: update.status,
        actorId: auth.profile.id,
        notes: body.notes || body.cancelled_reason || null,
      });
    }

    await logActivity({
      actorId: auth.profile.id,
      action: 'ORDER_UPDATED',
      entityType: 'order',
      entityId: id,
      metadata: {
        order_code: order.order_code,
        previous_status: order.status,
        new_status: updated.status,
        updated_fields: Object.keys(body),
      },
    });

    const refreshed = await getOrderBundle(auth.adminClient, id);
    return jsonResponse(refreshed, { message: 'Order updated.' });
  } catch (error) {
    return jsonError(error.message || 'Failed to update order.', error.status || 500);
  }
}
