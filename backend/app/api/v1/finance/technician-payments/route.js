import { NextResponse } from 'next/server';
import { requireFinanceOrAdmin, recordFinancialTransaction, logFinanceActivity } from '@/lib/supabase/financeAuth';

// GET: List all technician payments
export async function GET(request) {
  try {
    const auth = await requireFinanceOrAdmin(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { adminClient } = auth;
    const { searchParams } = new URL(request.url);
    const technicianId = searchParams.get('technician_id');
    const orderId = searchParams.get('order_id');
    const paymentType = searchParams.get('payment_type');

    let query = adminClient
      .from('technician_payments')
      .select(`
        id,
        technician_id,
        order_id,
        amount,
        payment_type,
        paid_at,
        payment_method,
        reference,
        created_at,
        created_by,
        technicians:technician_id (
          id,
          employee_code,
          is_available,
          profile:profile_id (
            id,
            full_name,
            email,
            phone
          )
        ),
        orders:order_id (
          id,
          order_code,
          system_capacity_kw,
          total_price,
          customer:customer_id (
            id,
            contact_name,
            company_name
          )
        )
      `)
      .order('paid_at', { ascending: false });

    if (technicianId) query = query.eq('technician_id', technicianId);
    if (orderId) query = query.eq('order_id', orderId);
    if (paymentType) query = query.eq('payment_type', paymentType);

    const { data: payments, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Also fetch available technicians for the payment modal dropdown
    const { data: technicians } = await adminClient
      .from('technicians')
      .select(`
        id,
        employee_code,
        profile:profile_id (
          id,
          full_name,
          phone
        )
      `);

    return NextResponse.json({
      success: true,
      data: payments || [],
      technicians: technicians || []
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Record new technician payment
export async function POST(request) {
  try {
    const auth = await requireFinanceOrAdmin(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { profile, adminClient } = auth;
    const body = await request.json();
    const {
      technician_id,
      order_id,
      amount,
      payment_type = 'labour',
      payment_method = 'bank_transfer',
      reference,
      paid_at
    } = body;

    if (!technician_id) {
      return NextResponse.json({ success: false, error: 'Technician is required.' }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid positive payment amount is required.' }, { status: 400 });
    }

    const insertData = {
      technician_id,
      order_id: order_id || null,
      amount: numericAmount,
      payment_type,
      payment_method,
      reference: reference || null,
      paid_at: paid_at || new Date().toISOString(),
      created_by: profile.id
    };

    const { data: newPayment, error: insertError } = await adminClient
      .from('technician_payments')
      .insert(insertData)
      .select(`
        *,
        technicians:technician_id (
          id,
          employee_code,
          profile:profile_id ( full_name )
        )
      `)
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // Record in immutable financial ledger
    await recordFinancialTransaction({
      transactionType: 'technician_payment',
      amount: numericAmount,
      referenceType: 'technician_payments',
      referenceId: newPayment.id,
      recordedBy: profile.id
    });

    // If linked to an order, also record under project_costs for accurate profitability tracking
    if (order_id) {
      await adminClient.from('project_costs').insert({
        order_id,
        cost_category: 'labour',
        amount: numericAmount,
        incurred_date: (paid_at || new Date().toISOString()).split('T')[0],
        notes: `Technician labour payment: ${reference || newPayment.id}`
      });
    }

    await logFinanceActivity({
      actorId: profile.id,
      action: 'TECHNICIAN_PAYMENT_RECORDED',
      entityType: 'technician_payments',
      entityId: newPayment.id,
      metadata: { amount: numericAmount, technician_id, order_id }
    });

    return NextResponse.json({
      success: true,
      message: 'Technician payment recorded successfully.',
      data: newPayment
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
