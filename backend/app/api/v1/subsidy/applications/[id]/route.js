import { NextResponse } from 'next/server';
import { requireCustomerOrFinanceOrAdmin, logFinanceActivity } from '@/lib/supabase/financeAuth';

// GET: Full subsidy application details
export async function GET(request, { params }) {
  try {
    const auth = await requireCustomerOrFinanceOrAdmin(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const { adminClient, isCustomer, customerRecord } = auth;

    const { data: application, error } = await adminClient
      .from('subsidy_applications')
      .select(`
        id,
        application_code,
        customer_id,
        order_id,
        subsidy_program,
        amount_applied,
        amount_approved,
        status,
        submitted_at,
        approved_at,
        notes,
        created_at,
        updated_at,
        customer:customer_id (
          id,
          contact_name,
          company_name,
          phone,
          email,
          customer_addresses ( address_line1, city, state, postal_code )
        ),
        order:order_id (
          id,
          order_code,
          system_capacity_kw,
          total_amount,
          advance_paid,
          balance_due,
          status
        ),
        subsidy_documents (
          id,
          document_type,
          storage_path,
          uploaded_at,
          uploaded_by
        )
      `)
      .eq('id', id)
      .single();

    if (error || !application) {
      return NextResponse.json({ success: false, error: 'Subsidy application not found.' }, { status: 404 });
    }

    // Customer security check: ensure customer can only view their own application
    if (isCustomer && customerRecord && application.customer_id !== customerRecord.id) {
      return NextResponse.json({ success: false, error: 'Access denied to this subsidy application.' }, { status: 403 });
    }

    // Fetch verification status for all documents associated with this application
    let docHistories = [];
    if (application.subsidy_documents && application.subsidy_documents.length > 0) {
      const docIds = application.subsidy_documents.map(d => d.id);
      const { data: histories } = await adminClient
        .from('document_verification_history')
        .select('*')
        .in('document_id', docIds)
        .order('created_at', { ascending: false });
      docHistories = histories || [];
    }

    const enrichedDocs = (application.subsidy_documents || []).map(doc => {
      const hist = docHistories.find(h => h.document_id === doc.id);
      return {
        ...doc,
        verificationStatus: hist?.status || 'pending',
        comments: hist?.comments || null,
        verifiedAt: hist?.verified_at || null
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...application,
        subsidy_documents: enrichedDocs
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Update subsidy application status or details (staff/admin only for approval/review)
export async function PATCH(request, { params }) {
  try {
    const auth = await requireCustomerOrFinanceOrAdmin(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const { profile, adminClient, isCustomer } = auth;
    const body = await request.json();

    const allowedStatuses = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'disbursed'];
    const updateData = { updated_at: new Date().toISOString() };

    // If customer is updating, they can only transition from draft to submitted
    if (isCustomer) {
      if (body.status && body.status !== 'submitted') {
        return NextResponse.json({ success: false, error: 'Customers cannot modify official review statuses.' }, { status: 403 });
      }
      if (body.status === 'submitted') {
        updateData.status = 'submitted';
        updateData.submitted_at = new Date().toISOString();
      }
      if (body.notes !== undefined) {
        updateData.notes = body.notes;
      }
    } else {
      // Staff / Accounts / Admin can update status and approval amount
      if (body.status) {
        if (!allowedStatuses.includes(body.status)) {
          return NextResponse.json({ success: false, error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` }, { status: 400 });
        }
        updateData.status = body.status;
        if (body.status === 'submitted' && !body.submitted_at) {
          updateData.submitted_at = new Date().toISOString();
        }
        if (body.status === 'approved' && !body.approved_at) {
          updateData.approved_at = new Date().toISOString();
        }
      }

      if (body.amount_approved !== undefined) {
        const approvedNum = parseFloat(body.amount_approved);
        if (!isNaN(approvedNum)) {
          updateData.amount_approved = approvedNum;
        }
      }

      if (body.notes !== undefined) {
        updateData.notes = body.notes;
      }
    }

    const { data: updatedApp, error: updateError } = await adminClient
      .from('subsidy_applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    await logFinanceActivity({
      actorId: profile.id,
      action: 'SUBSIDY_APPLICATION_UPDATED',
      entityType: 'subsidy_applications',
      entityId: id,
      metadata: updateData
    });

    return NextResponse.json({
      success: true,
      message: 'Subsidy application updated successfully.',
      data: updatedApp
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
