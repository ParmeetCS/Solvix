import { jsonResponse, jsonError, handleOptions } from '@/lib/utils';
import { requireSalesOrAdmin, logActivity } from '@/lib/supabase/salesAuth';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * Generate unique human-readable lead code (e.g. "LEAD-2026-0042")
 */
function generateLeadCode() {
  const yr = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LEAD-${yr}-${rand}`;
}

/**
 * GET /api/v1/sales/leads
 * Lists leads with filtering, search, pagination, and RBAC scope.
 */
export async function GET(request) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isAdmin, adminClient } = authResult;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const source = searchParams.get('source') || '';
    const priority = searchParams.get('priority') || '';
    const assignedTo = searchParams.get('assigned_to') || '';
    const checkDuplicate = searchParams.get('check_duplicate') || ''; // phone or email
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100);
    const offset = (page - 1) * limit;

    // Check duplicate check utility for UI creation step
    if (checkDuplicate) {
      const term = checkDuplicate.trim();
      const { data: duplicates } = await adminClient
        .from('leads')
        .select('id, lead_code, customer_name, phone, email, status, created_at')
        .or(`phone.eq.${term},email.eq.${term}`)
        .limit(5);

      return jsonResponse({ duplicates: duplicates || [] });
    }

    let query = adminClient
      .from('leads')
      .select(`
        *,
        assigned_profile:assigned_to ( id, full_name, email ),
        customer:customer_id ( id, customer_code, contact_name, phone, email )
      `, { count: 'exact' });

    // Enforce Sales Employee scope
    if (!isAdmin) {
      query = query.eq('assigned_to', profile.id);
    } else if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (source && source !== 'all') {
      query = query.eq('source', source);
    }
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,lead_code.ilike.%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: leads, count, error } = await query;
    if (error) {
      return jsonError('Failed to fetch leads: ' + error.message, 500);
    }

    return jsonResponse({
      leads: leads || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    return jsonError('Error processing leads list: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/sales/leads
 * Creates a new lead with duplicate checking and assignment audit.
 */
export async function POST(request) {
  try {
    const authResult = await requireSalesOrAdmin(request);
    if (authResult.error) {
      return jsonError(authResult.error, authResult.status);
    }

    const { profile, isAdmin, adminClient } = authResult;
    const body = await request.json();

    const {
      customer_name,
      phone,
      email,
      address,
      source = 'website',
      system_type = 'on-grid',
      expected_capacity_kw,
      monthly_electricity_bill,
      additional_requirements,
      assigned_to,
      priority = 'medium',
      notes,
      estimated_value = 0,
      bypass_duplicate_check = false
    } = body;

    if (!customer_name || !phone) {
      return jsonError('Customer name and phone number are required.', 400);
    }

    // Duplicate detection based on phone or email
    if (!bypass_duplicate_check) {
      let dupQuery = adminClient
        .from('leads')
        .select('id, lead_code, customer_name, phone, email, status, created_at');

      if (email && email.trim()) {
        dupQuery = dupQuery.or(`phone.eq.${phone.trim()},email.eq.${email.trim()}`);
      } else {
        dupQuery = dupQuery.eq('phone', phone.trim());
      }

      const { data: potentialDups } = await dupQuery;
      if (potentialDups && potentialDups.length > 0) {
        return jsonResponse({
          duplicateWarning: true,
          message: 'Potential duplicate lead(s) found with identical phone or email.',
          duplicates: potentialDups
        }, { status: 409 });
      }
    }

    const leadCode = generateLeadCode();

    // Default assignment: If admin assigns someone, or assign to creator if sales
    const finalAssignedTo = isAdmin ? (assigned_to || profile.id) : profile.id;

    const newLeadPayload = {
      lead_code: leadCode,
      customer_name: customer_name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : null,
      address: address || null,
      source,
      status: 'new',
      system_type,
      expected_capacity_kw: expected_capacity_kw ? parseFloat(expected_capacity_kw) : null,
      monthly_electricity_bill: monthly_electricity_bill ? parseFloat(monthly_electricity_bill) : null,
      additional_requirements: additional_requirements || null,
      assigned_to: finalAssignedTo,
      priority,
      notes: notes || null,
      estimated_value: estimated_value ? parseFloat(estimated_value) : 0,
      created_by: profile.id,
      updated_by: profile.id
    };

    const { data: createdLead, error: insertError } = await adminClient
      .from('leads')
      .insert(newLeadPayload)
      .select('*')
      .single();

    if (insertError) {
      return jsonError('Database error creating lead: ' + insertError.message, 500);
    }

    // Record initial assignment history in lead_assignments
    if (finalAssignedTo) {
      await adminClient.from('lead_assignments').insert({
        lead_id: createdLead.id,
        assigned_to: finalAssignedTo,
        assigned_by: profile.id,
        notes: 'Initial assignment upon lead creation'
      });
    }

    // Log to activity_logs
    await logActivity({
      actorId: profile.id,
      action: 'LEAD_CREATED',
      entityType: 'lead',
      entityId: createdLead.id,
      metadata: { lead_code: leadCode, customer_name, phone, source }
    });

    return jsonResponse(createdLead, { message: 'Lead created successfully.', status: 201 });
  } catch (error) {
    return jsonError('Server error creating lead: ' + error.message, 500);
  }
}
