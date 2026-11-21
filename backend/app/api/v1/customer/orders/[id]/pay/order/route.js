import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireCustomer } from '@/lib/supabase/roles';
import { getOrderBundle, assertCustomerOrderAccess } from '@/lib/quotation/data';
import { createRazorpayOrder, razorpayConfig } from '@/lib/payments/razorpay';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/customer/orders/[id]/pay/order
 * body: { mode: 'full' | 'partial', amount?: number (rupees, partial only) }
 * The amount is always checked against the order's outstanding balance on the
 * server; the browser never decides what is owed.
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireCustomer(request);
    if (auth.error) return jsonError(auth.error, auth.status);
    const { id } = await params;
    const { keyId } = razorpayConfig();

    const bundle = await getOrderBundle(auth.adminClient, id);
    assertCustomerOrderAccess(bundle.order, auth.customer);
    const order = bundle.order;

    if (['cancelled', 'refunded'].includes(order.status)) {
      return jsonError('This order is cancelled, so it cannot be paid.', 409);
    }
    const balance = Math.round(Number(order.balance_due) * 100) / 100;
    if (!(balance > 0)) return jsonError('This order has no balance due.', 409);

    const body = await request.json().catch(() => ({}));
    const mode = body.mode === 'partial' ? 'partial' : 'full';
    let amount = balance;
    if (mode === 'partial') {
      amount = Math.round(Number(body.amount) * 100) / 100;
      if (!Number.isFinite(amount) || amount < 1) return jsonError('Enter an amount of at least Rs 1.', 400);
      if (amount >= balance) return jsonError('That covers the full balance. Choose "Pay in full" instead.', 400);
    }

    const rzpOrder = await createRazorpayOrder({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: String(order.order_code).slice(0, 40),
      notes: {
        solvix_order_id: id,
        solvix_customer_id: auth.customer.id,
        mode,
      },
    });

    return jsonResponse({
      key_id: keyId,
      razorpay_order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      mode,
      order_code: order.order_code,
      balance_due: balance,
      customer: {
        name: auth.customer.contact_name || auth.profile?.full_name || '',
        email: auth.customer.email || auth.profile?.email || '',
        phone: auth.customer.phone || auth.profile?.phone || '',
      },
    });
  } catch (error) {
    return jsonError(error.message || 'Could not start the payment.', error.status || 500);
  }
}
