import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireFinanceOrAdmin, logFinanceActivity } from '@/lib/supabase/financeAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/finance/invoices/[id]
 */
export async function GET(request, { params }) {
  try {
    const authResult = await requireFinanceOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { adminClient } = authResult;
    const { id } = await params;

    const { data: invoice, error } = await adminClient
      .from('invoices')
      .select(`
        id,
        invoice_code,
        status,
        issue_date,
        due_date,
        currency,
        notes,
        created_at,
        updated_at,
        order_id,
        customer_id,
        created_by,
        customers:customer_id(id, customer_code, contact_name, phone, email, company_name),
        orders:order_id(id, order_code, total_amount, advance_paid, balance_due, payment_status),
        invoice_items(id, line_item, quantity, unit_price, tax_amount, total_price),
        profiles:created_by(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error || !invoice) {
      return jsonError('Invoice not found.', 404);
    }

    // Also fetch any payments linked to the order
    let orderPayments = [];
    if (invoice.order_id) {
      const { data: pmts } = await adminClient
        .from('payments')
        .select('id, payment_code, amount, payment_type, payment_method, status, paid_at')
        .eq('order_id', invoice.order_id)
        .order('paid_at', { ascending: false });
      orderPayments = pmts || [];
    }

    let subtotal = 0;
    let taxTotal = 0;
    (invoice.invoice_items || []).forEach((item) => {
      subtotal += parseFloat(item.total_price) || 0;
      taxTotal += parseFloat(item.tax_amount) || 0;
    });

    return jsonResponse({
      invoice: {
        ...invoice,
        calculated_subtotal: subtotal,
        calculated_tax: taxTotal,
        calculated_total: subtotal + taxTotal
      },
      payments: orderPayments
    });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}

/**
 * PATCH /api/v1/finance/invoices/[id]
 * Updates invoice status (sent, paid, partially_paid, overdue, cancelled) or details.
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

    const { status, due_date, notes } = body;

    const allowedStatuses = ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'];
    if (status && !allowedStatuses.includes(status)) {
      return jsonError(`Invalid status. Allowed: ${allowedStatuses.join(', ')}`, 400);
    }

    const updatePayload = {
      updated_at: new Date().toISOString()
    };
    if (status) updatePayload.status = status;
    if (due_date) updatePayload.due_date = due_date;
    if (notes !== undefined) updatePayload.notes = notes.trim();

    const { data: updatedInvoice, error: updateErr } = await adminClient
      .from('invoices')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      return jsonError('Failed to update invoice: ' + updateErr.message, 500);
    }

    await logFinanceActivity({
      actorId: profile.id,
      action: 'INVOICE_UPDATED',
      entityType: 'invoice',
      entityId: id,
      metadata: updatePayload
    });

    return jsonResponse(updatedInvoice, { message: 'Invoice updated successfully.' });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
