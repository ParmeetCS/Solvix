import { NextResponse } from 'next/server';
import { requireCustomerOrFinanceOrAdmin, logFinanceActivity } from '@/lib/supabase/financeAuth';

// GET: List subsidy applications
export async function GET(request) {
  try {
    const auth = await requireCustomerOrFinanceOrAdmin(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { adminClient, isCustomer, customerRecord } = auth;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const program = searchParams.get('program');
    const search = searchParams.get('search');

    let query = adminClient
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
        customer:customer_id (
          id,
          contact_name,
          company_name,
          phone,
          email
        ),
        order:order_id (
          id,
          order_code,
          system_capacity_kw,
          total_amount
        ),
        subsidy_documents (
          id,
          document_type,
          storage_path,
          uploaded_at
        )
      `)
      .order('created_at', { ascending: false });

    // Strict customer isolation: customers see only their own applications
    if (isCustomer && customerRecord) {
      query = query.eq('customer_id', customerRecord.id);
    }

    if (status) query = query.eq('status', status);
    if (program) query = query.eq('subsidy_program', program);
    if (search) {
      query = query.ilike('application_code', `%${search}%`);
    }

    const { data: applications, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: applications || []
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Create a new subsidy application
export async function POST(request) {
  try {
    const auth = await requireCustomerOrFinanceOrAdmin(request);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { profile, adminClient, isCustomer, customerRecord } = auth;
    const body = await request.json();
    let {
      customer_id,
      order_id,
      subsidy_program = 'PM Surya Ghar Muft Bijli Yojana',
      amount_applied,
      notes
    } = body;

    // If customer is creating, enforce customer_id to their own ID
    if (isCustomer) {
      if (!customerRecord) {
        return NextResponse.json({ success: false, error: 'Customer profile record not found.' }, { status: 400 });
      }
      customer_id = customerRecord.id;
    }

    if (!customer_id) {
      return NextResponse.json({ success: false, error: 'Customer ID is required.' }, { status: 400 });
    }

    const numericAmount = parseFloat(amount_applied);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid applied subsidy amount is required.' }, { status: 400 });
    }

    // Generate unique application code
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const application_code = `SUB-${year}-${rand}`;

    const { data: newApp, error: insertError } = await adminClient
      .from('subsidy_applications')
      .insert({
        application_code,
        customer_id,
        order_id: order_id || null,
        subsidy_program,
        amount_applied: numericAmount,
        status: 'draft',
        notes: notes || null
      })
      .select(`
        *,
        customer:customer_id ( contact_name )
      `)
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    await logFinanceActivity({
      actorId: profile.id,
      action: 'SUBSIDY_APPLICATION_CREATED',
      entityType: 'subsidy_applications',
      entityId: newApp.id,
      metadata: { application_code, customer_id, subsidy_program, amount_applied: numericAmount }
    });

    return NextResponse.json({
      success: true,
      message: 'Subsidy application initiated successfully.',
      data: newApp
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
