import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';
import { getOrderBundle, assertOrderAccess } from '@/lib/quotation/data';
import { PAYMENT_METHODS, PAYMENT_TYPES } from '@/lib/quotation/status';

export async function OPTIONS() {
  return handleOptions();
}

async function loadOrder(auth, id) {
  const bundle = await getOrderBundle(auth.adminClient, id);
  assertOrderAccess(bundle.order, auth.profile, auth.isAdmin);
  return bundle;
}

/** GET /api/v1/sales/orders/[id]/payments */
export async function GET(request, { params }) {
  try {
    const auth = await requireSalesOrAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const { id } = await params;
    const bundle = await loadOrder(auth, id);
    return jsonResponse({
      payments: bundle.payments,
      order: bundle.order,
    });
  } catch (error) {
    return jsonError(error.message || 'Failed to load payments.', error.status || 500);
  }
}

/**
 * POST /api/v1/sales/orders/[id]/payments
 * Records a manually verified payment (cash, cheque, transfer, UPI, card or
 * finance). The API never marks a payment as gateway-verified. A verified
 * gateway integration must call the RPC directly with p_gateway_verified.
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireSalesOrAdmin(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const { id } = await params;
    const bundle = await loadOrder(auth, id);
    const order = bundle.order;

    const body = await request.json();
    const amount = Number(body.amount);
    const paymentType = body.payment_type || 'advance';
    const paymentMethod = body.payment_method || 'bank_transfer';
    const reference = String(body.transaction_reference || '').trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonError('Payment amount must be greater than zero.', 400);
    }
    if (!PAYMENT_TYPES.includes(paymentType)) {
      return jsonError('Invalid payment type.', 400);
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return jsonError('Invalid payment method.', 400);
    }
    if (['cheque', 'bank_transfer', 'upi', 'card', 'finance'].includes(paymentMethod) && !reference) {
      return jsonError('A payment reference is required for this payment method.', 400);
    }

    const paidAt = body.paid_at ? new Date(body.paid_at) : new Date();
    if (Number.isNaN(paidAt.getTime())) return jsonError('Payment date is invalid.', 400);

    const { data, error } = await auth.adminClient.rpc('record_order_payment', {
      p_order_id: id,
      p_actor_id: auth.profile.id,
      p_amount: amount,
      p_payment_type: paymentType,
      p_payment_method: paymentMethod,
      p_transaction_reference: reference || null,
      p_paid_at: paidAt.toISOString(),
      p_notes: body.notes || null,
      p_gateway_verified: false,
    });

    if (error) {
      return jsonError('Failed to record payment: ' + error.message, 409);
    }

    await logActivity({
      actorId: auth.profile.id,
      action: 'ORDER_PAYMENT_RECORDED',
      entityType: 'order',
      entityId: id,
      metadata: {
        order_code: order.order_code,
        payment_code: data?.payment?.payment_code,
        amount,
        payment_type: paymentType,
        payment_method: paymentMethod,
        payment_status: data?.order?.payment_status,
        gateway_verified: false,
      },
    });

    return jsonResponse(data, {
      status: 201,
      message: 'Payment recorded. Remaining balance has been recalculated.',
    });
  } catch (error) {
    return jsonError(error.message || 'Failed to record payment.', error.status || 500);
  }
}
