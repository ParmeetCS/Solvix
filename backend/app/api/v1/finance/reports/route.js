import { NextResponse } from 'next/server';
import { requireFinanceOrAdmin } from '@/lib/supabase/financeAuth';

export async function GET(request) {
  try {
    const auth = await requireFinanceOrAdmin(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { adminClient } = auth;
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('report_type') || 'revenue';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const format = searchParams.get('format'); // 'csv' or 'json'

    let result = {
      reportType,
      generatedAt: new Date().toISOString(),
      summary: {},
      records: []
    };

    if (reportType === 'revenue') {
      let query = adminClient
        .from('payments')
        .select(`
          id,
          payment_code,
          order_id,
          amount,
          payment_type,
          payment_method,
          transaction_reference,
          status,
          paid_at,
          orders:order_id (
            order_code,
            customer:customer_id ( contact_name )
          )
        `)
        .order('paid_at', { ascending: false });

      if (startDate) query = query.gte('paid_at', `${startDate}T00:00:00Z`);
      if (endDate) query = query.lte('paid_at', `${endDate}T23:59:59Z`);

      const { data: payments } = await query;
      const recs = (payments || []).map(p => ({
        paymentCode: p.payment_code,
        orderCode: p.orders?.order_code || 'N/A',
        customer: p.orders?.customer?.contact_name || 'N/A',
        amount: parseFloat(p.amount) || 0,
        type: p.payment_type,
        method: p.payment_method,
        reference: p.transaction_reference || 'N/A',
        status: p.status,
        date: p.paid_at ? p.paid_at.split('T')[0] : 'N/A'
      }));

      const totalRevenue = recs
        .filter(r => r.status === 'verified' || r.status === 'completed')
        .reduce((sum, r) => sum + r.amount, 0);

      result.summary = {
        totalCollected: totalRevenue,
        paymentCount: recs.length,
        verifiedCount: recs.filter(r => r.status === 'verified').length
      };
      result.records = recs;

    } else if (reportType === 'expenses') {
      let query = adminClient
        .from('expenses')
        .select('*')
        .order('incurred_date', { ascending: false });

      if (startDate) query = query.gte('incurred_date', startDate);
      if (endDate) query = query.lte('incurred_date', endDate);

      const { data: expenses } = await query;
      const recs = (expenses || []).map(e => ({
        expenseCode: e.expense_code,
        category: e.category,
        description: e.description,
        amount: parseFloat(e.amount) || 0,
        date: e.incurred_date,
        projectId: e.project_id || 'General'
      }));

      const totalExpenses = recs.reduce((sum, r) => sum + r.amount, 0);
      result.summary = {
        totalExpenses,
        expenseCount: recs.length
      };
      result.records = recs;

    } else if (reportType === 'invoices') {
      let query = adminClient
        .from('invoices')
        .select(`
          id,
          invoice_code,
          status,
          issue_date,
          due_date,
          customer:customer_id ( contact_name ),
          order:order_id ( order_code ),
          invoice_items ( total_price )
        `)
        .order('issue_date', { ascending: false });

      if (startDate) query = query.gte('issue_date', startDate);
      if (endDate) query = query.lte('issue_date', endDate);

      const { data: invoices } = await query;
      const recs = (invoices || []).map(inv => {
        const total = (inv.invoice_items || []).reduce((sum, it) => sum + (parseFloat(it.total_price) || 0), 0);
        return {
          invoiceCode: inv.invoice_code,
          orderCode: inv.order?.order_code || 'N/A',
          customer: inv.customer?.contact_name || 'N/A',
          issueDate: inv.issue_date,
          dueDate: inv.due_date || 'N/A',
          totalAmount: total,
          status: inv.status
        };
      });

      result.summary = {
        totalInvoiced: recs.reduce((sum, r) => sum + r.totalAmount, 0),
        invoiceCount: recs.length,
        paidCount: recs.filter(r => r.status === 'paid').length,
        overdueCount: recs.filter(r => r.status === 'overdue').length
      };
      result.records = recs;

    } else if (reportType === 'outstanding') {
      const { data: orders } = await adminClient
        .from('orders')
        .select(`
          id,
          order_code,
          total_price,
          advance_paid,
          balance_due,
          status,
          customer:customer_id ( contact_name, phone )
        `)
        .gt('balance_due', 0)
        .order('balance_due', { ascending: false });

      const recs = (orders || []).map(o => ({
        orderCode: o.order_code,
        customer: o.customer?.contact_name || 'N/A',
        phone: o.customer?.phone || 'N/A',
        totalPrice: parseFloat(o.total_price) || 0,
        advancePaid: parseFloat(o.advance_paid) || 0,
        balanceDue: parseFloat(o.balance_due) || 0,
        orderStatus: o.status
      }));

      result.summary = {
        totalOutstanding: recs.reduce((sum, r) => sum + r.balanceDue, 0),
        ordersWithPendingBalance: recs.length
      };
      result.records = recs;

    } else if (reportType === 'technician_payments') {
      let query = adminClient
        .from('technician_payments')
        .select(`
          id,
          amount,
          payment_type,
          paid_at,
          payment_method,
          reference,
          technician:technician_id (
            technician_code,
            profile:profile_id ( full_name )
          ),
          order:order_id ( order_code )
        `)
        .order('paid_at', { ascending: false });

      if (startDate) query = query.gte('paid_at', `${startDate}T00:00:00Z`);
      if (endDate) query = query.lte('paid_at', `${endDate}T23:59:59Z`);

      const { data: payments } = await query;
      const recs = (payments || []).map(tp => ({
        technician: tp.technician?.profile?.full_name || tp.technician?.technician_code || 'N/A',
        orderCode: tp.order?.order_code || 'N/A',
        amount: parseFloat(tp.amount) || 0,
        type: tp.payment_type,
        method: tp.payment_method,
        reference: tp.reference || 'N/A',
        date: tp.paid_at ? tp.paid_at.split('T')[0] : 'N/A'
      }));

      result.summary = {
        totalTechnicianDisbursed: recs.reduce((sum, r) => sum + r.amount, 0),
        payoutCount: recs.length
      };
      result.records = recs;
    }

    // CSV format generation if requested
    if (format === 'csv') {
      if (!result.records || result.records.length === 0) {
        return new Response('No data available for the selected filters', {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${reportType}-report.csv"`
          }
        });
      }

      const headers = Object.keys(result.records[0]).join(',');
      const rows = result.records.map(rec =>
        Object.values(rec)
          .map(val => `"${String(val).replace(/"/g, '""')}"`)
          .join(',')
      );
      const csvContent = [headers, ...rows].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
