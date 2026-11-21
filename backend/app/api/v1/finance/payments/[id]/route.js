import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireFinanceOrAdmin, logFinanceActivity, recordFinancialTransaction } from '@/lib/supabase/financeAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/finance/payments/[id]
 */
export async function GET(request, { params }) {
  try {
    const authResult = await requireFinanceOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;
    const { id } = await params;

    const { data: payment, error } = await adminClient
      .from('payments')
      .select(`
        id,
        payment_code,
        order_id,
        customer_id,
        amount,
        payment_type,
        payment_method,
        transaction_reference,
        gateway_verified,
        gateway_reference,
        status,
        paid_at,
        notes,
        created_at,
        customers:customer_id(id, customer_code, contact_name, phone, email),
        orders:order_id(id, order_code, total_amount, advance_paid, balance_due, payment_status),
        profiles:recorded_by(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error || !payment) {
      return jsonError('Payment record not found.', 404);
    }

    return jsonResponse(payment);
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}

/**
 * PATCH /api/v1/finance/payments/[id]
 * Reconcile / verify or refund a payment.
 */
export async function PATCH(request, { params }) {
  try {
    const authResult = await requireFinanceOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { action, reconciliation_notes = '' } = body; // action: 'verify' | 'refund'

    const { data: existingPayment, error: fetchErr } = await adminClient
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existingPayment) {
      return jsonError('Payment not found.', 404);
    }

    if (action === 'verify') {
      const { data: updatedPayment, error: updErr } = await adminClient
        .from('payments')
        .update({
          status: 'verified',
          gateway_verified: true,
          notes: (existingPayment.notes || '') + `\n[Verified by ${profile.full_name || profile.email} on ${new Date().toLocaleDateString()}] ${reconciliation_notes}`
        })
        .eq('id', id)
        .select('*')
        .single();

      if (updErr) {
        return jsonError('Failed to verify payment: ' + updErr.message, 500);
      }

      await logFinanceActivity({
        actorId: profile.id,
        action: 'PAYMENT_VERIFIED',
        entityType: 'payment',
        entityId: id,
        metadata: { payment_code: existingPayment.payment_code }
      });

      return jsonResponse(updatedPayment, { message: 'Payment verified and reconciled successfully.' });
    }

    if (action === 'refund') {
      if (existingPayment.status === 'refunded') {
        return jsonError('This payment is already marked as refunded.', 400);
      }

      const { data: updatedPayment, error: updErr } = await adminClient
        .from('payments')
        .update({
          status: 'refunded',
          notes: (existingPayment.notes || '') + `\n[Refunded by ${profile.full_name || profile.email} on ${new Date().toLocaleDateString()}] Reason: ${reconciliation_notes}`
        })
        .eq('id', id)
        .select('*')
        .single();

      if (updErr) {
        return jsonError('Failed to refund payment: ' + updErr.message, 500);
      }

      // Revert order balance
      const { data: order } = await adminClient
        .from('orders')
        .select('total_amount, advance_paid')
        .eq('id', existingPayment.order_id)
        .single();

      if (order) {
        const refundAmt = parseFloat(existingPayment.amount) || 0;
        const newAdvance = Math.max(0, (parseFloat(order.advance_paid) || 0) - refundAmt);
        const orderTotal = parseFloat(order.total_amount) || 0;
        const newBalance = Math.max(0, orderTotal - newAdvance);

        await adminClient
          .from('orders')
          .update({
            advance_paid: newAdvance,
            balance_due: newBalance,
            payment_status: newBalance >= orderTotal ? 'pending' : (newAdvance > 0 ? 'partial' : 'pending'),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPayment.order_id);
      }

      // Record reversal in financial transactions
      await recordFinancialTransaction({
        transactionType: 'refund',
        amount: parseFloat(existingPayment.amount) || 0,
        currency: 'INR',
        referenceType: 'payment_refund',
        referenceId: id,
        recordedBy: profile.id
      });

      await logFinanceActivity({
        actorId: profile.id,
        action: 'PAYMENT_REFUNDED',
        entityType: 'payment',
        entityId: id,
        metadata: { payment_code: existingPayment.payment_code, refund_amount: existingPayment.amount }
      });

      return jsonResponse(updatedPayment, { message: 'Payment marked as refunded and order balance updated.' });
    }

    return jsonError('Invalid action. Must be "verify" or "refund".', 400);
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
