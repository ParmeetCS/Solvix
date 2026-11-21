import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireFinanceOrAdmin, logFinanceActivity } from '@/lib/supabase/financeAuth';

export async function OPTIONS() {
  return handleOptions();
}

function generateInvoiceNumber() {
  const yr = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yr}-${rand}`;
}

/**
 * GET /api/v1/finance/invoices
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
    const customer_id = searchParams.get('customer_id') || '';
    const order_id = searchParams.get('order_id') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = adminClient
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
        customers:customer_id(id, customer_code, contact_name, phone, email),
        orders:order_id(id, order_code, total_amount),
        invoice_items(id, line_item, quantity, unit_price, tax_amount, total_price)
      `, { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }
    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }
    if (order_id) {
      query = query.eq('order_id', order_id);
    }
    if (search) {
      query = query.or(`invoice_code.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    query = query
      .order('issue_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: invoices, count, error } = await query;
    if (error) {
      return jsonError('Database error fetching invoices: ' + error.message, 500);
    }

    const enriched = (invoices || []).map((inv) => {
      let subtotal = 0;
      let taxTotal = 0;
      (inv.invoice_items || []).forEach((item) => {
        subtotal += parseFloat(item.total_price) || 0;
        taxTotal += parseFloat(item.tax_amount) || 0;
      });
      return {
        ...inv,
        calculated_subtotal: subtotal,
        calculated_tax: taxTotal,
        calculated_total: subtotal + taxTotal
      };
    });

    return jsonResponse({
      invoices: enriched,
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
 * POST /api/v1/finance/invoices
 * Creates invoice with itemized charges and links to order.
 */
export async function POST(request) {
  try {
    const authResult = await requireFinanceOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, adminClient } = authResult;
    const body = await request.json().catch(() => ({}));

    const {
      order_id,
      customer_id,
      issue_date = new Date().toISOString().split('T')[0],
      due_date = null,
      currency = 'INR',
      notes = '',
      items = []
    } = body;

    if (!customer_id) {
      return jsonError('customer_id is required.', 400);
    }

    // Check duplicate invoice prevention for same order if not intentional
    if (order_id) {
      const { data: existingInvoices } = await adminClient
        .from('invoices')
        .select('id, invoice_code, status')
        .eq('order_id', order_id)
        .in('status', ['draft', 'sent', 'paid']);

      if (existingInvoices && existingInvoices.length > 0 && !body.allow_additional_invoice) {
        return jsonError(`An active invoice (${existingInvoices[0].invoice_code}) already exists for this order. Set allow_additional_invoice=true to authorize separate billing.`, 409);
      }
    }

    const invoiceCode = generateInvoiceNumber();

    // Insert invoice header
    const { data: newInvoice, error: invErr } = await adminClient
      .from('invoices')
      .insert({
        invoice_code: invoiceCode,
        order_id: order_id || null,
        customer_id,
        status: 'draft',
        issue_date,
        due_date: due_date || null,
        currency,
        notes: notes.trim(),
        created_by: profile.id
      })
      .select('*')
      .single();

    if (invErr) {
      return jsonError('Failed to create invoice header: ' + invErr.message, 500);
    }

    // Insert line items
    const lineItemsToInsert = items.length > 0 ? items.map((item) => {
      const qty = parseFloat(item.quantity) || 1;
      const unitP = parseFloat(item.unit_price) || 0;
      const taxAmt = parseFloat(item.tax_amount) || 0;
      const totalP = qty * unitP;
      return {
        invoice_id: newInvoice.id,
        line_item: (item.line_item || 'Solar System Hardware / Service').trim(),
        quantity: qty,
        unit_price: unitP,
        tax_amount: taxAmt,
        total_price: totalP
      };
    }) : [{
      invoice_id: newInvoice.id,
      line_item: 'Rooftop Solar PV System Installation & Commissioning',
      quantity: 1,
      unit_price: 150000,
      tax_amount: 18000,
      total_price: 150000
    }];

    const { data: createdItems, error: itemsErr } = await adminClient
      .from('invoice_items')
      .insert(lineItemsToInsert)
      .select('*');

    if (itemsErr) {
      return jsonError('Failed to save invoice line items: ' + itemsErr.message, 500);
    }

    // Log activity
    await logFinanceActivity({
      actorId: profile.id,
      action: 'INVOICE_CREATED',
      entityType: 'invoice',
      entityId: newInvoice.id,
      metadata: { invoice_code: invoiceCode, customer_id, order_id, item_count: createdItems.length }
    });

    return jsonResponse({
      ...newInvoice,
      items: createdItems
    }, { message: `Invoice ${invoiceCode} created successfully.`, status: 201 });
  } catch (error) {
    return jsonError('Server error: ' + error.message, 500);
  }
}
