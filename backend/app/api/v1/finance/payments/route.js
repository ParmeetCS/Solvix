import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireFinanceOrAdmin, logFinanceActivity, recordFinancialTransaction } from '@/lib/supabase/financeAuth';

export async function OPTIONS() {
  return handleOptions();
}

function generatePaymentCode() {
  const yr = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${yr}-${rand}`;
}

/**
 * GET /api/v1/finance/payments
 */
export async function GET(request) {
  try {
    const authResult = await requireFinanceOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const payment_method = searchParams.get('payment_method') || '';
    const customer_id = searchParams.get('customer_id') || '';
    const order_id = searchParams.get('order_id') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = adminClient
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
        recorded_by,
        customers:customer_id(id, customer_code, contact_name, phone, email),
        orders:order_id(id, order_code, total_amount, balance_due, payment_status),
        profiles:recorded_by(id, full_name, email)
      `, { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }
    if (payment_method) {
      query = query.eq('payment_method', payment_method);
    }
    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }
    if (order_id) {
      query = query.eq('order_id', order_id);
    }
    if (search) {
      query = query.or(`payment_code.ilike.%${search}%,transaction_reference.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    query = query
      .order('paid_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: payments, count, error } = await query;
    if (error) {
      return jsonError('Database error fetching payments: ' + error.message, 500);
    }

    return jsonResponse({
      payments: payments || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/finance/payments
 * Records a verified or pending payment, updates order balance, updates invoice, and writes to immutable ledger.
 */
export async function POST(request) {
  try {
    const authResult = await requireFinanceOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json().catch(() => ({}));

    let {
      order_id,
      customer_id,
      amount,
      payment_type = 'advance', // 'advance' | 'partial' | 'full' | 'refund'
      payment_method = 'bank_transfer', // 'cash' | 'bank_transfer' | 'upi' | 'card' | 'finance' | 'other'
      transaction_reference = '',
      gateway_verified = false,
      gateway_reference = '',
      status = 'verified', // 'recorded' | 'verified' | 'failed' | 'refunded'
      notes = ''
    } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return jsonError('A valid positive amount is required.', 400);
    }

    if (!order_id || !customer_id) {
      return jsonError('order_id and customer_id are required.', 400);
    }

    // Verify order exists
    const { data: order, error: orderErr } = await adminClient
      .from('orders')
      .select('id, order_code, total_amount, advance_paid, balance_due, payment_status')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) {
      return jsonError('Associated order not found.', 404);
    }

    // Duplicate check: prevent duplicate payment with same reference on same order
    if (transaction_reference) {
      const { data: dup } = await adminClient
        .from('payments')
        .select('id, payment_code')
        .eq('order_id', order_id)
        .eq('transaction_reference', transaction_reference.trim())
        .maybeSingle();

      if (dup) {
        return jsonError(`Duplicate payment detected. Reference "${transaction_reference}" was already recorded in payment ${dup.payment_code}.`, 409);
      }
    }

    const paymentCode = generatePaymentCode();

    // Map method to check constraint ('cash','cheque','bank_transfer','upi','card','finance','other')
    const validMethods = ['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'finance', 'other'];
    let safeMethod = payment_method.toLowerCase();
    if (!validMethods.includes(safeMethod)) safeMethod = 'other';

    // Map type to check constraint ('advance','partial','full','refund')
    const validTypes = ['advance', 'partial', 'full', 'refund'];
    let safeType = payment_type.toLowerCase();
    if (!validTypes.includes(safeType)) safeType = 'partial';

    // Insert payment
    const { data: newPayment, error: insertErr } = await adminClient
      .from('payments')
      .insert({
        payment_code: paymentCode,
        order_id,
        customer_id,
        amount: numAmount,
        payment_type: safeType,
        payment_method: safeMethod,
        transaction_reference: transaction_reference.trim() || null,
        gateway_verified: Boolean(gateway_verified),
        gateway_reference: gateway_reference.trim() || null,
        status,
        notes: notes.trim(),
        recorded_by: profile.id
      })
      .select('*')
      .single();

    if (insertErr) {
      return jsonError('Database error recording payment: ' + insertErr.message, 500);
    }

    // Update order balance and payment status if payment is verified or recorded
    if (status === 'verified' || status === 'recorded') {
      const currentAdvance = parseFloat(order.advance_paid) || 0;
      const orderTotal = parseFloat(order.total_amount) || 0;

      let newAdvance = currentAdvance;
      if (safeType === 'refund') {
        newAdvance = Math.max(0, currentAdvance - numAmount);
      } else {
        newAdvance = currentAdvance + numAmount;
      }

      const newBalanceDue = Math.max(0, orderTotal - newAdvance);
      let newPaymentStatus = 'pending';
      if (newBalanceDue === 0 && newAdvance > 0) {
        newPaymentStatus = 'paid';
      } else if (newAdvance > 0) {
        newPaymentStatus = 'partial';
      }

      await adminClient
        .from('orders')
        .update({
          advance_paid: newAdvance,
          balance_due: newBalanceDue,
          payment_status: newPaymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', order_id);

      // Check linked invoices to update status
      const { data: invs } = await adminClient
        .from('invoices')
        .select('id, status')
        .eq('order_id', order_id)
        .in('status', ['sent', 'partially_paid', 'issued']);

      if (invs && invs.length > 0) {
        const invTargetStatus = newBalanceDue === 0 ? 'paid' : 'partially_paid';
        for (const inv of invs) {
          await adminClient
            .from('invoices')
            .update({ status: invTargetStatus, updated_at: new Date().toISOString() })
            .eq('id', inv.id);
        }
      }

      // Record in immutable financial transactions ledger
      await recordFinancialTransaction({
        transactionType: safeType === 'refund' ? 'refund' : 'payment_received',
        amount: numAmount,
        currency: 'INR',
        referenceType: 'payment',
        referenceId: newPayment.id,
        recordedBy: profile.id
      });
    }

    // Log activity
    await logFinanceActivity({
      actorId: profile.id,
      action: 'PAYMENT_RECORDED',
      entityType: 'payment',
      entityId: newPayment.id,
      metadata: { payment_code: paymentCode, order_id, amount: numAmount, status }
    });

    return jsonResponse(newPayment, { message: `Payment ${paymentCode} recorded successfully.`, status: 201 });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
