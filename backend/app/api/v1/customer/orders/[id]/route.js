import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireCustomer } from '@/lib/supabase/roles';
import { getOrderBundle, assertCustomerOrderAccess } from '@/lib/quotation/data';

export async function OPTIONS() {
  return handleOptions();
}

/** GET /api/v1/customer/orders/[id] — own orders only. */
export async function GET(request, { params }) {
  try {
    const auth = await requireCustomer(request);
    if (auth.error) return jsonError(auth.error, auth.status);

    const { id } = await params;
    const bundle = await getOrderBundle(auth.adminClient, id);
    assertCustomerOrderAccess(bundle.order, auth.customer);

    return jsonResponse({
      order: bundle.order,
      quotation: bundle.quotation,
      items: bundle.items,
      payments: bundle.payments.map((payment) => ({
        id: payment.id,
        payment_code: payment.payment_code,
        amount: payment.amount,
        payment_type: payment.payment_type,
        payment_method: payment.payment_method,
        transaction_reference: payment.transaction_reference,
        paid_at: payment.paid_at,
        status: payment.status,
      })),
      statusHistory: bundle.statusHistory,
    });
  } catch (error) {
    return jsonError(error.message || 'Failed to load order.', error.status || 500);
  }
}
