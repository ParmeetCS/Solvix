import { NextResponse } from 'next/server';
import { requireCustomerOrFinanceOrAdmin, logFinanceActivity } from '@/lib/supabase/financeAuth';

// GET: List documents for an application
export async function GET(request) {
  try {
    const auth = await requireCustomerOrFinanceOrAdmin(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { adminClient } = auth;
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('application_id');

    if (!applicationId) {
      return NextResponse.json({ success: false, error: 'application_id is required.' }, { status: 400 });
    }

    const { data: docs, error } = await adminClient
      .from('subsidy_documents')
      .select(`
        id,
        application_id,
        document_type,
        storage_path,
        uploaded_at,
        uploaded_by,
        profiles:uploaded_by ( full_name )
      `)
      .eq('application_id', applicationId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Get verification records
    const docIds = (docs || []).map(d => d.id);
    let verifications = [];
    if (docIds.length > 0) {
      const { data: verifs } = await adminClient
        .from('document_verification_history')
        .select('*')
        .in('document_id', docIds)
        .order('created_at', { ascending: false });
      verifications = verifs || [];
    }

    const merged = (docs || []).map(d => {
      const v = verifications.find(vh => vh.document_id === d.id);
      return {
        ...d,
        status: v?.status || 'pending',
        comments: v?.comments || null,
        verified_at: v?.verified_at || null
      };
    });

    return NextResponse.json({
      success: true,
      data: merged
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Add uploaded document to subsidy application
export async function POST(request) {
  try {
    const auth = await requireCustomerOrFinanceOrAdmin(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { profile, adminClient } = auth;
    const body = await request.json();
    const { application_id, document_type, storage_path } = body;

    if (!application_id || !document_type || !storage_path) {
      return NextResponse.json({ success: false, error: 'application_id, document_type, and storage_path are required.' }, { status: 400 });
    }

    const { data: newDoc, error: insertError } = await adminClient
      .from('subsidy_documents')
      .insert({
        application_id,
        document_type,
        storage_path,
        uploaded_by: profile.id
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // Initialize document_verification_history as pending
    await adminClient.from('document_verification_history').insert({
      document_id: newDoc.id,
      status: 'pending',
      comments: 'Awaiting documentation officer verification.'
    });

    await logFinanceActivity({
      actorId: profile.id,
      action: 'SUBSIDY_DOCUMENT_UPLOADED',
      entityType: 'subsidy_documents',
      entityId: newDoc.id,
      metadata: { application_id, document_type, storage_path }
    });

    return NextResponse.json({
      success: true,
      message: 'Document registered for verification.',
      data: newDoc
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Verify or reject a subsidy document (staff only)
export async function PATCH(request) {
  try {
    const auth = await requireCustomerOrFinanceOrAdmin(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { profile, adminClient, isCustomer } = auth;
    if (isCustomer) {
      return NextResponse.json({ success: false, error: 'Customers cannot verify documents.' }, { status: 403 });
    }

    const body = await request.json();
    const { document_id, status, comments } = body;

    if (!document_id || !status) {
      return NextResponse.json({ success: false, error: 'document_id and status are required.' }, { status: 400 });
    }

    const validStatuses = ['pending', 'verified', 'rejected', 'requires_resubmission'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const { data: verif, error } = await adminClient
      .from('document_verification_history')
      .insert({
        document_id,
        status,
        verified_by: profile.id,
        verified_at: new Date().toISOString(),
        comments: comments || null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    await logFinanceActivity({
      actorId: profile.id,
      action: 'SUBSIDY_DOCUMENT_VERIFIED',
      entityType: 'document_verification_history',
      entityId: verif.id,
      metadata: { document_id, status, comments }
    });

    return NextResponse.json({
      success: true,
      message: `Document status updated to ${status}.`,
      data: verif
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
