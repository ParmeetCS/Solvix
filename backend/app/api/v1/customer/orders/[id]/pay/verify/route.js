import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireCustomer } from '@/lib/supabase/roles';
import { getOrderBundle, assertCustomerOrderAccess } from '@/lib/quotation/data';
import { logActivity } from '@/lib/supabase/salesAuth';
import { fetchRazorpayOrder, fetchRazorpayPayment, verifyCheckoutSignature } from '@/lib/payments/razorpay';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/customer/orders/[id]/pay/verify
 * body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Records the payment only after the signature and Razorpay's own record of the
 * payment agree. Safe to call twice: a payment id is only ever recorded once.
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireCustomer(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { razorpay_order_id: rzpOrderId, razorpay_payment_id: rzpPaymentId, razorpay_signature: signature } = body;
    if (!rzpOrderId || !rzpPaymentId || !signature) return jsonError('Missing payment details.', 400);

    if (!verifyCheckoutSignature(rzpOrderId, rzpPaymentId, signature)) {
      return jsonError('Payment could not be verified.', 400);
    }

    const bundle = await getOrderBundle(auth.adminClient, id);
    assertCustomerOrderAccess(bundle.order, auth.customer);

    // Already recorded (page refreshed or retried): just report the current state.
    const existing = (bundle.payments || []).find((p) => p.transaction_reference === rzpPaymentId);
    if (existing) {
      return jsonResponse({ payment: existing, order: bundle.order, already_recorded: true }, { message: 'Payment already recorded.' });
    }

    // Trust Razorpay's records, not the browser: the order must be ours and the payment captured.
    const [rzpOrder, rzpPayment] = await Promise.all([fetchRazorpayOrder(rzpOrderId), fetchRazorpayPayment(rzpPaymentId)]);
    if (rzpOrder.notes?.solvix_order_id !== id || rzpOrder.notes?.solvix_customer_id !== auth.customer.id) {
      return jsonError('This payment does not belong to this order.', 403);
    }
    if (rzpPayment.order_id !== rzpOrderId || !['captured', 'authorized'].includes(rzpPayment.status)) {
      return jsonError('Payment was not completed.', 409);
    }

    const amount = Number(rzpPayment.amount) / 100;
    const balance = Number(bundle.order.balance_due);
    const isFull = amount >= balance - 0.01;
    const paidBefore = Number(bundle.order.advance_paid || 0);
    const paymentType = isFull ? 'full' : paidBefore > 0 ? 'partial' : 'advance';
    const method = rzpPayment.method === 'card' ? 'card' : rzpPayment.method === 'upi' ? 'upi' : 'other';

    const { data, error } = await auth.adminClient.rpc('record_order_payment', {
      p_order_id: id,
      p_actor_id: auth.profile.id,
      p_amount: amount,
      p_payment_type: paymentType,
      p_payment_method: method,
      p_transaction_reference: rzpPaymentId,
      p_paid_at: new Date((rzpPayment.created_at || Date.now() / 1000) * 1000).toISOString(),
      p_notes: `Razorpay ${rzpPayment.method || ''} payment (order ${rzpOrderId})`.trim(),
      p_gateway_verified: true,
    });
    if (error) return jsonError('Payment received but could not be recorded: ' + error.message, 409);

    await logActivity({
      actorId: auth.profile.id,
      action: 'ORDER_PAYMENT_RECORDED',
      entityType: 'order',
      entityId: id,
      metadata: {
        order_code: bundle.order.order_code,
        payment_code: data?.payment?.payment_code,
        amount,
        payment_type: paymentType,
        payment_method: method,
        gateway: 'razorpay',
        gateway_payment_id: rzpPaymentId,
        gateway_verified: true,
      },
    });

    return jsonResponse(data, { status: 201, message: 'Payment successful.' });
  } catch (error) {
    return jsonError(error.message || 'Payment verification failed.', error.status || 500);
  }
}
