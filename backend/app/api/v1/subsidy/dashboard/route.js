import { NextResponse } from 'next/server';
import { requireCustomerOrFinanceOrAdmin } from '@/lib/supabase/financeAuth';

export async function GET(request) {
  try {
    const auth = await requireCustomerOrFinanceOrAdmin(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { adminClient, isCustomer, customerRecord } = auth;

    let query = adminClient
      .from('subsidy_applications')
      .select('id, status, amount_applied, amount_approved, subsidy_program, created_at, customer_id');

    if (isCustomer && customerRecord) {
      query = query.eq('customer_id', customerRecord.id);
    }

    const { data: apps, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const allApps = apps || [];

    // Calculate status counts
    const statusCounts = {
      total: allApps.length,
      draft: allApps.filter(a => a.status === 'draft').length,
      submitted: allApps.filter(a => a.status === 'submitted').length,
      under_review: allApps.filter(a => a.status === 'under_review').length,
      approved: allApps.filter(a => a.status === 'approved').length,
      rejected: allApps.filter(a => a.status === 'rejected').length,
      disbursed: allApps.filter(a => a.status === 'disbursed').length
    };

    const totalApplied = allApps.reduce((s, a) => s + (parseFloat(a.amount_applied) || 0), 0);
    const totalApproved = allApps.reduce((s, a) => s + (parseFloat(a.amount_approved) || 0), 0);

    // Get documents count and pending verification count
    let pendingDocumentsCount = 0;
    try {
      const { data: pendingDocs } = await adminClient
        .from('document_verification_history')
        .select('id, status')
        .eq('status', 'pending');
      pendingDocumentsCount = (pendingDocs || []).length;
    } catch (e) {
      // Non-blocking
    }

    // Program breakdown
    const programBreakdown = {};
    allApps.forEach(a => {
      const prog = a.subsidy_program || 'Other';
      programBreakdown[prog] = (programBreakdown[prog] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        statusCounts,
        financials: {
          totalApplied,
          totalApproved
        },
        pendingDocumentsCount,
        programBreakdown
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
